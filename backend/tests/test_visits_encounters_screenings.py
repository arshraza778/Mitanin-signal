"""
Targeted test suite for Phase 2B: Stitch Screens 6, 7 & 8
(Village Visit Planner, Active Encounter, and Screening Risk Triage)
"""

import json
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.session import SessionLocal, init_db
from app.db.models import User, VillageVisit, PatientEncounter, PatientScreening
from app.db.seed import seed_database
from app.schemas import (
    UpdateVisitStatusRequest,
    CreateEncounterRequest,
    UpdateEncounterRequest,
    CompleteEncounterRequest,
    CreateScreeningRequest,
)
from app.main import (
    _compute_screening_triage_result,
    get_employee_visits,
    get_employee_visit_detail,
    update_visit_status,
    create_patient_encounter,
    get_patient_encounter,
    update_patient_encounter,
    complete_patient_encounter,
    create_patient_screening,
    get_patient_screening,
    get_supervisor_visits,
)


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
        yield db
    finally:
        db.close()


@pytest.fixture
def mitanin_user(db_session: Session):
    user = db_session.query(User).filter(User.role == "mitanin").first()
    assert user is not None
    return user


@pytest.fixture
def supervisor_user(db_session: Session):
    user = db_session.query(User).filter(User.role.in_(["block_supervisor", "supervisor"])).first()
    assert user is not None
    return user


def test_visits_retrieval_and_filtering(db_session: Session, mitanin_user: User):
    """Verifies that Mitanin can retrieve visits and filter by priority."""
    res = get_employee_visits(
        priority="all",
        status="all",
        village_id=None,
        date_filter=None,
        user=mitanin_user,
        db=db_session,
    )
    assert "visits" in res
    assert "cluster_summary" in res
    assert len(res["visits"]) >= 4

    # Filter by urgent priority
    urgent_res = get_employee_visits(
        priority="urgent",
        status="all",
        village_id=None,
        date_filter=None,
        user=mitanin_user,
        db=db_session,
    )
    for v in urgent_res["visits"]:
        assert v["priority"] == "urgent"


def test_visit_status_transition(db_session: Session, mitanin_user: User):
    """Verifies valid state transitions and rejection of invalid status."""
    visit = db_session.query(VillageVisit).filter(VillageVisit.household_id == "HH-14B").first()
    assert visit is not None

    req = UpdateVisitStatusRequest(status="in_progress", notes="Starting visit at Kodenar Tola")
    res = update_visit_status(visit_id=visit.id, req=req, user=mitanin_user, db=db_session)
    assert res["status"] == "in_progress"

    # Invalid status should raise 400
    with pytest.raises(HTTPException) as exc_info:
        update_visit_status(
            visit_id=visit.id,
            req=UpdateVisitStatusRequest(status="invalid_status"),
            user=mitanin_user,
            db=db_session,
        )
    assert exc_info.value.status_code == 400


def test_encounter_creation_and_idempotency(db_session: Session, mitanin_user: User):
    """Verifies encounter creation, linked visit status change, and duplicate protection."""
    visit = db_session.query(VillageVisit).filter(VillageVisit.household_id == "HH-14B").first()
    token = f"test_token_{datetime.now().timestamp()}"

    enc_req = CreateEncounterRequest(
        visit_id=visit.id,
        household_id="HH-14B",
        household_name="Baghel Parivar",
        patient_name="Devki Kashyap",
        patient_identifier="DK-8842",
        age=22,
        gender="Female",
        gestation_weeks=31.0,
        danger_signs={"severe_headache_vision": False, "pedal_oedema": True},
        vitals={"hb": 8.1, "bp": "112/74", "temp": 98.4},
        submission_token=token,
    )

    created = create_patient_encounter(req=enc_req, user=mitanin_user, db=db_session)
    assert created["patient_name"] == "Devki Kashyap"
    assert created["submission_token"] == token

    # Second call with same token must return existing record (idempotency)
    duplicate = create_patient_encounter(req=enc_req, user=mitanin_user, db=db_session)
    assert duplicate["id"] == created["id"]

    # Test completing encounter
    comp_res = complete_patient_encounter(
        encounter_id=created["id"],
        req=CompleteEncounterRequest(notes="Completed checkup", supplies_dispensed={"ifa": 30}),
        user=mitanin_user,
        db=db_session,
    )
    assert comp_res["status"] == "completed"

    # Confirm linked visit updated to completed
    db_session.refresh(visit)
    assert visit.status == "completed"


def test_screening_two_tier_triage_rules(db_session: Session, mitanin_user: User):
    """Verifies Tier A statutory rules and Tier B explainable weights."""
    now = datetime.now(timezone.utc)
    screening_req = CreateScreeningRequest(
        patient_name="Devki Kashyap",
        patient_identifier="DK-8842",
        age=22,
        gender="Female",
        gestation_weeks=31.0,
        mode="standard",
        vitals={"hb": 8.1, "bp": "112/74", "rbs": 104, "temp": 98.4, "malaria_rdt": "negative"},
        danger_signs={"pedal_oedema": True, "vaginal_bleeding": False},
        submission_token=f"screen_tok_{now.timestamp()}",
    )

    result = _compute_screening_triage_result(screening_req, mitanin_user, now)

    # 1. Tier A Statutory Rule Check: Gestation >= 28w and Hb < 9.0 -> Ultrasound within 72h
    assert result["risk_category"] in ("High", "Elevated")
    assert "Tier-2 Sub-Divisional Referral" in result["dual_validation"]["tier_a"]["escalation"]
    assert "MCH-CG-04" in result["dual_validation"]["tier_a"]["sop_reference"]

    # 2. Tier B Heuristic Score Check: Composite score between 50 and 85
    assert 50 <= result["composite_risk_score"] <= 85
    assert len(result["feature_weights"]) >= 3

    # Check that weights contain the explainability features
    factors = [w["factor"] for w in result["feature_weights"]]
    assert any("Gestational Age" in f for f in factors)
    assert any("Canopy Humidity" in f for f in factors)
    assert any("Neurological" in f for f in factors)

    # Save via API endpoint
    saved_screening = create_patient_screening(req=screening_req, user=mitanin_user, db=db_session)
    assert saved_screening["risk_category"] == result["risk_category"]
    assert saved_screening["composite_risk_score"] == result["composite_risk_score"]


def test_supervisor_visits_overview(db_session: Session, supervisor_user: User):
    """Verifies that supervisors can view all visits in their assigned blocks."""
    res = get_supervisor_visits(
        block_id=None,
        priority=None,
        status=None,
        user=supervisor_user,
        db=db_session,
    )
    assert "visits" in res
    assert res["total"] >= 4
    assert len(res["allowed_blocks"]) > 0
