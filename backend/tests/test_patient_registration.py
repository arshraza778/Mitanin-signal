"""
Targeted test suite for Phase 2C: Stitch Screen 5
(Patient Registration & Intake, ABHA Format Validation, Duplicate Detection,
Jurisdiction Security, and Audit Logging)
"""

import json
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.session import SessionLocal, init_db
from app.db.models import User, Patient, PatientRegistrationAudit
from app.db.seed import seed_database
from app.schemas import (
    CreatePatientRequest,
    CheckDuplicatePatientRequest,
    VerifyAbhaRequest,
)
from app.main import (
    validate_abha_number,
    check_duplicate_patient,
    register_patient,
    get_patient_detail,
    list_patients,
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


def test_abha_format_validation():
    """Verify ABHA format validation with strict honesty disclaimer."""
    # 1. Valid 14-digit format
    req_valid = VerifyAbhaRequest(abha_number="91-4209-8812-3091")
    res_valid = validate_abha_number(req_valid)
    assert res_valid["valid"] is True
    assert res_valid["normalized_abha"] == "91-4209-8812-3091"
    assert res_valid["verified_by_external_service"] is False
    assert "checked locally" in res_valid["message"]

    # 2. Valid raw 14 digits unhyphenated
    req_raw = VerifyAbhaRequest(abha_number="91420988123091")
    res_raw = validate_abha_number(req_raw)
    assert res_raw["valid"] is True
    assert res_raw["normalized_abha"] == "91-4209-8812-3091"

    # 3. Invalid length
    req_invalid = VerifyAbhaRequest(abha_number="12345")
    res_invalid = validate_abha_number(req_invalid)
    assert res_invalid["valid"] is False
    assert "Invalid format" in res_invalid["message"]


def test_patient_registration_persistence_and_audit(db_session: Session, mitanin_user: User):
    """Verify successful patient registration, fields persistence, and audit event creation."""
    ts = int(datetime.now(timezone.utc).timestamp())
    sub_token = f"test-token-reg-{ts}"
    unique_suffix = f"{ts % 9000 + 1000}"
    test_abha = f"91-4209-8812-{unique_suffix}"
    req = CreatePatientRequest(
        full_name_en="Mangli Bai Kashyap",
        full_name_hi="मंगली बाई कश्यप",
        age=28,
        dob="14/05/1996",
        gender="Female",
        contact_number="9406281104",
        contact_owner="Household head (Rameshwar Kashyap)",
        primary_dialect="Halbi",
        gram_panchayat="Karanji",
        faliya_para="Patelpara, Sector 04",
        household_id="HH-04",
        district_id="LGD_DIST_374",
        block_id="LGD_BLK_3595",
        id_mode="abha",
        abha_number=test_abha,
        ration_card_tier="AAY",
        sickle_cell_trait="Carrier",
        currently_pregnant=True,
        lmp_date="2024-10-18",
        gestational_age_weeks=21.4,
        edd="2025-07-25",
        baseline_vitals={
            "height_cm": 152,
            "weight_kg": 44.2,
            "muac_cm": 21.4,
            "bp": "108/68",
            "hb_gdl": 8.9,
            "rbs_mgdl": 104,
            "malaria_rdt": "Non-Reactive",
        },
        consent_audio_verified=True,
        consent_language="halbi",
        informed_consent_certified=True,
        thumbprint_verified=True,
        mitanin_token_signature="#K-VERMA",
        submission_token=sub_token,
    )

    created = register_patient(req, user=mitanin_user, db=db_session)
    assert created["id"] is not None
    assert created["patient_identifier"] == f"ABHA-{test_abha}"
    assert created["full_name_en"] == "Mangli Bai Kashyap"
    assert created["full_name_hi"] == "मंगली बाई कश्यप"
    assert created["currently_pregnant"] is True
    assert created["baseline_vitals"]["hb_gdl"] == 8.9
    assert created["registered_by_id"] == mitanin_user.id

    # Verify audit log entry
    audit = db_session.query(PatientRegistrationAudit).filter(
        PatientRegistrationAudit.patient_id == created["id"]
    ).first()
    assert audit is not None
    assert audit.action == "patient_registered"
    assert audit.user_id == mitanin_user.id

    # Verify lookup via detail endpoint
    fetched = get_patient_detail(created["id"], user=mitanin_user, db=db_session)
    assert fetched["patient_identifier"] == f"ABHA-{test_abha}"


def test_patient_registration_idempotency(db_session: Session, mitanin_user: User):
    """Verify safe idempotency token replay returns existing patient without creating duplicate."""
    sub_token = f"test-token-idempotent-{int(datetime.now(timezone.utc).timestamp())}"
    req = CreatePatientRequest(
        full_name_en="Devki Poyam",
        age=24,
        gender="Female",
        id_mode="offline",
        block_id="LGD_BLK_3595",
        submission_token=sub_token,
    )

    first = register_patient(req, user=mitanin_user, db=db_session)
    second = register_patient(req, user=mitanin_user, db=db_session)

    assert first["id"] == second["id"]
    assert first["patient_identifier"] == second["patient_identifier"]


def test_duplicate_abha_rejection(db_session: Session, mitanin_user: User):
    """Verify attempting to register a different patient with an already used ABHA raises 409 Conflict."""
    req_first = CreatePatientRequest(
        full_name_en="First Patient",
        age=30,
        gender="Female",
        id_mode="abha",
        abha_number="91-9999-8888-7777",
        block_id="LGD_BLK_3595",
        submission_token="sub-tok-dup-1",
    )
    register_patient(req_first, user=mitanin_user, db=db_session)

    req_second = CreatePatientRequest(
        full_name_en="Second Patient With Same ABHA",
        age=32,
        gender="Female",
        id_mode="abha",
        abha_number="91-9999-8888-7777",
        block_id="LGD_BLK_3595",
        submission_token="sub-tok-dup-2",
    )
    with pytest.raises(HTTPException) as exc_info:
        register_patient(req_second, user=mitanin_user, db=db_session)
    assert exc_info.value.status_code == 409
    assert "already registered" in exc_info.value.detail


def test_check_duplicate_preflight(db_session: Session, mitanin_user: User):
    """Verify duplicate check endpoint finds existing patients by ABHA and phone."""
    # Register seed patient
    req = CreatePatientRequest(
        full_name_en="Somari Markam",
        age=26,
        contact_number="9876543210",
        id_mode="abha",
        abha_number="91-1111-2222-3333",
        block_id="LGD_BLK_3595",
        submission_token="sub-tok-chk-dup",
    )
    register_patient(req, user=mitanin_user, db=db_session)

    # 1. Check duplicate with matching ABHA
    chk_abha = check_duplicate_patient(
        CheckDuplicatePatientRequest(abha_number="91-1111-2222-3333"),
        user=mitanin_user,
        db=db_session,
    )
    assert chk_abha["is_duplicate"] is True
    assert chk_abha["matches_count"] >= 1

    # 2. Check duplicate with matching Phone
    chk_phone = check_duplicate_patient(
        CheckDuplicatePatientRequest(contact_number="9876543210"),
        user=mitanin_user,
        db=db_session,
    )
    assert chk_phone["is_duplicate"] is True

    # 3. Check non-duplicate
    chk_none = check_duplicate_patient(
        CheckDuplicatePatientRequest(abha_number="91-0000-0000-0000", contact_number="9111111111"),
        user=mitanin_user,
        db=db_session,
    )
    assert chk_none["is_duplicate"] is False


def test_patient_list_and_search(db_session: Session, mitanin_user: User):
    """Verify patient listing and text search."""
    listing = list_patients(search="Mangli", user=mitanin_user, db=db_session)
    assert listing["total"] >= 1
    assert any("Mangli" in p["full_name_en"] for p in listing["patients"])
