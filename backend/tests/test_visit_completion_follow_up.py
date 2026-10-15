import json
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, User, VillageVisit, PatientEncounter, Task, Patient
from app.schemas import CompleteEncounterRequest
from app.main import complete_patient_encounter, list_patient_encounters, get_patient_encounter
from fastapi import HTTPException


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Seed mock user and mitanin
    worker = User(
        id=10,
        username="asha_poyam",
        name="Asha Poyam",
        role="mitanin",
        district_id="LGD_DIST_374",
        block_id="LGD_BLK_3595",
        village_id="VIL_KARANJI",
    )
    db.add(worker)

    # Seed registered patient
    patient = Patient(
        id=1,
        patient_identifier="CG-8842-9102",
        abha_number="91-4209-8812-3091",
        full_name_en="Devki Kashyap",
        full_name_hi="देवकी कश्यप",
        age=26,
        gender="Female",
        primary_dialect="Halbi",
        gram_panchayat="Karanji",
        household_id="HH-14B",
        district_id="LGD_DIST_374",
        block_id="LGD_BLK_3595",
        registered_by_id=10,
        registered_by_name="Asha Poyam",
        currently_pregnant=True,
    )
    db.add(patient)

    # Seed village visit
    visit = VillageVisit(
        id=101,
        village_id="VIL_KARANJI",
        block_id="LGD_BLK_3595",
        district_id="LGD_DIST_374",
        household_id="HH-14B",
        household_name="Baghel Parivar",
        hamlet="Patelpara",
        head_of_household="Ramesh Kashyap",
        family_size=5,
        priority="High",
        visit_reason="ANC Trimester 3 & Hb Monitoring",
        scheduled_date="2026-10-14",
        status="in_progress",
        assigned_mitanin_id=10,
        assigned_mitanin_name="Asha Poyam",
        dialect="Halbi",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(visit)

    # Seed active patient encounter #501
    enc = PatientEncounter(
        id=501,
        visit_id=101,
        household_id="HH-14B",
        household_name="Baghel Parivar",
        patient_name="Devki Kashyap",
        patient_identifier="CG-8842-9102",
        age=26,
        gender="Female",
        gestation_weeks=31.0,
        district_id="LGD_DIST_374",
        block_id="LGD_BLK_3595",
        village_id="VIL_KARANJI",
        mitanin_id=10,
        mitanin_name="Asha Poyam",
        status="in_progress",
        elapsed_seconds=2040,  # 34 mins
        danger_signs=json.dumps({"pedal_oedema": True, "headache": "mild"}),
        vitals=json.dumps({"hb": 8.1, "bp": "112/74", "pulse": 78}),
        optical_strip_result=json.dumps({"protein": "Nil", "glucose": "Trace"}),
        supplies=json.dumps({"ifa_red_strips": 1, "halazone_packets": 2}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(enc)

    # Seed another encounter in the same block for a different patient
    enc2 = PatientEncounter(
        id=502,
        visit_id=None,
        household_id="HH-22",
        household_name="Mandavi Parivar",
        patient_name="Sukri Mandavi",
        patient_identifier="CG-9912-3001",
        age=24,
        gender="Female",
        gestation_weeks=28.0,
        district_id="LGD_DIST_374",
        block_id="LGD_BLK_3595",
        village_id="VIL_KARANJI",
        mitanin_id=10,
        mitanin_name="Asha Poyam",
        status="in_progress",
        elapsed_seconds=900,
        created_at=datetime.now(timezone.utc),
    )
    db.add(enc2)

    db.commit()

    yield db
    db.close()


def test_complete_patient_encounter_success(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()
    
    req = CompleteEncounterRequest(
        notes="Encounter concluded under Protocol Rev 4.2. Moderate anaemia noted; 30 IFA tabs handed over.",
        supplies_dispensed={
            "ifa_red": {"count": 30, "batch": "CG-BST-24B"},
            "halazone": {"count": 20, "batch": "HAL-2026"},
            "audio_discharge": "Module 31B",
        },
        follow_up_schedule=[
            {
                "type": "specialist_chc",
                "title": "Specialist ANC Checkup • Jagdalpur CHC",
                "facility": "Jagdalpur CHC",
                "doctor": "Dr. Suniti Baghel",
                "date": "2026-10-17",
                "slot": "09:15 AM Slot",
                "priority": "High Priority Consultation",
            },
            {
                "type": "transport_102",
                "title": "102 Mahtari Express Assigned",
                "trip_id": "MX-881",
                "pickup": "Karanji Hamlet Point",
                "time": "17 Oct • 08:00 AM",
            },
            {
                "type": "domiciliary_routine",
                "title": "Repeat Hb & Edema Evaluation",
                "in_days": 14,
                "date": "2026-10-28",
            },
        ],
        attestation={
            "audio_guidance_token": "AUD-GUIDE-501",
            "dialect": "Halbi",
            "attestation_mode": "frontline_self_attestation",
            "mpin_verified": False,
            "mitanin_sign": "Asha Poyam (MIT-774)",
            "disclaimer": "Client-side field attestation prototype; no external STQC or UIDAI verification performed.",
        },
        discharge_summary={
            "triage_level": "Moderate",
            "primary_concern": "Hb 8.1 g/dL",
            "compliance": "High",
        },
        submission_token="sub_token_completion_001",
    )

    result = complete_patient_encounter(501, req, user=worker, db=test_db)
    
    assert result["status"] == "completed"
    assert result["completed_at"] is not None
    assert result["completion_token"] == "sub_token_completion_001"
    assert len(result["follow_up_schedule"]) == 3
    assert result["attestation"]["mpin_verified"] is False
    assert result["attestation"]["attestation_mode"] == "frontline_self_attestation"

    # Linked visit must be marked completed
    visit = test_db.query(VillageVisit).filter(VillageVisit.id == 101).first()
    assert visit.status == "completed"
    assert "Protocol Rev 4.2" in visit.last_visit_notes

    # Follow-up task must be logged in tasks table with encounter_id linkage
    task = test_db.query(Task).filter(Task.encounter_id == 501).first()
    assert task is not None
    assert "Devki Kashyap" in task.title
    assert task.status == "sent"
    assert "enc_501_fu" in task.follow_up_key


def test_complete_encounter_idempotency(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()
    
    req = CompleteEncounterRequest(
        notes="Initial completion",
        submission_token="idempotent_sub_999",
        follow_up_schedule=[{"type": "domiciliary_routine", "title": "Repeat Hb Check"}],
    )

    first_res = complete_patient_encounter(501, req, user=worker, db=test_db)
    assert first_res["status"] == "completed"

    # Re-sending the same completion request with identical submission_token
    second_res = complete_patient_encounter(501, req, user=worker, db=test_db)
    assert second_res["id"] == first_res["id"]
    assert second_res["status"] == "completed"

    # Must NOT duplicate tasks
    tasks = test_db.query(Task).filter(Task.encounter_id == 501).all()
    assert len(tasks) == 1


def test_separate_encounters_create_independent_tasks(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()

    # Complete encounter 501
    req1 = CompleteEncounterRequest(
        notes="Completion 501",
        submission_token="sub_501",
        follow_up_schedule=[{"type": "domiciliary_routine", "title": "Repeat Checkup"}],
    )
    complete_patient_encounter(501, req1, user=worker, db=test_db)

    # Complete encounter 502 for a different patient in the same block
    req2 = CompleteEncounterRequest(
        notes="Completion 502",
        submission_token="sub_502",
        follow_up_schedule=[{"type": "domiciliary_routine", "title": "Repeat Checkup"}],
    )
    complete_patient_encounter(502, req2, user=worker, db=test_db)

    # Both encounters MUST have their own respective tasks created without blocking each other
    tasks_501 = test_db.query(Task).filter(Task.encounter_id == 501).all()
    tasks_502 = test_db.query(Task).filter(Task.encounter_id == 502).all()
    assert len(tasks_501) == 1
    assert len(tasks_502) == 1
    assert "Devki Kashyap" in tasks_501[0].title
    assert "Sukri Mandavi" in tasks_502[0].title


def test_get_patient_encounter_hydration(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()
    res = get_patient_encounter(501, user=worker, db=test_db)
    assert res["id"] == 501
    assert res["patient_name"] == "Devki Kashyap"
    assert res["patient_record"] is not None
    assert res["patient_record"]["full_name_hi"] == "देवकी कश्यप"
    assert res["patient_record"]["primary_dialect"] == "Halbi"


def test_missing_encounter_handling(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()
    with pytest.raises(HTTPException) as exc_info:
        get_patient_encounter(9999, user=worker, db=test_db)
    assert exc_info.value.status_code == 404


def test_complete_encounter_jurisdiction_check(test_db):
    other_worker = User(
        id=99,
        username="outsider_mitanin",
        name="Outsider Worker",
        role="mitanin",
        district_id="LGD_DIST_OTHER",
        block_id="LGD_BLK_OTHER",
        village_id="VIL_OTHER",
    )
    test_db.add(other_worker)
    test_db.commit()

    req = CompleteEncounterRequest(notes="Unauthorized attempt")
    
    with pytest.raises(HTTPException) as exc_info:
        complete_patient_encounter(501, req, user=other_worker, db=test_db)
    
    assert exc_info.value.status_code == 403
    assert "jurisdiction" in exc_info.value.detail.lower()


def test_list_patient_encounters(test_db):
    worker = test_db.query(User).filter(User.id == 10).first()
    encounters = list_patient_encounters(household_id="HH-14B", user=worker, db=test_db)
    assert len(encounters) == 1
    assert encounters[0]["patient_name"] == "Devki Kashyap"
