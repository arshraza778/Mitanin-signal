"""
SQLAlchemy models for Mitanin Signal Prototype
"""

from datetime import datetime, timezone
import json
from typing import Optional, List, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class LocationUnit(Base):
    __tablename__ = "location_units"

    unit_id = Column(String(64), primary_key=True)
    unit_name = Column(String(128), nullable=False)
    level = Column(String(32), nullable=False, index=True)  # district, block, village
    parent_id = Column(String(64), nullable=True, index=True)
    forecast_unit_id = Column(String(64), nullable=True, index=True)  # Maps demo unit to telemetry unit (None for real LGD units)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    health_facility = Column(Text, nullable=True)  # JSON-encoded local health facility info
    state_name = Column(String(64), nullable=True, default="Chhattisgarh")
    state_lgd_code = Column(Integer, nullable=True, default=22)
    district_lgd_code = Column(Integer, nullable=True, index=True)
    block_lgd_code = Column(Integer, nullable=True, index=True)
    coordinate_type = Column(String(128), nullable=True)
    coordinate_source = Column(String(255), nullable=True)
    boundary_source = Column(String(255), nullable=True)
    is_demo = Column(Boolean, nullable=False, default=False)

    def to_dict(self) -> dict:
        facility = None
        if self.health_facility:
            try:
                facility = json.loads(self.health_facility)
            except Exception:
                facility = {"name": self.health_facility}
        is_demo_flag = bool(self.is_demo)
        return {
            "unit_id": self.unit_id,
            "unit_name": self.unit_name,
            "level": self.level,
            "parent_id": self.parent_id,
            "forecast_unit_id": self.forecast_unit_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "health_facility": facility,
            "state_name": self.state_name or "Chhattisgarh",
            "state_lgd_code": self.state_lgd_code if self.state_lgd_code is not None else 22,
            "district_lgd_code": self.district_lgd_code,
            "block_lgd_code": self.block_lgd_code,
            "coordinate_type": self.coordinate_type,
            "coordinate_source": self.coordinate_source,
            "boundary_source": self.boundary_source,
            "is_demo": is_demo_flag,
            "data_label": "DEMO DATA" if is_demo_flag else "Official Chhattisgarh LGD Dataset",
        }


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    run_id = Column(String(64), primary_key=True)
    data_source = Column(String(64), nullable=False, default="simulated")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    summary = Column(Text, nullable=True)

    alerts = relationship("Alert", back_populates="run", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unit_id = Column(String(64), nullable=False, index=True)
    disease_type = Column(String(32), nullable=False, default="malaria", index=True)  # malaria, dengue, diarrhoea, heat
    risk = Column(String(32), nullable=False)  # High, Medium, Low
    confidence = Column(Float, nullable=False)
    forecast_period = Column(String(128), nullable=False)
    method_used = Column(String(64), nullable=False)  # weather_model, seasonal_baseline, meteorological_heat_index
    run_id = Column(String(64), ForeignKey("pipeline_runs.run_id"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    series_data = Column(Text, nullable=True)      # JSON-encoded series and intervals
    details = Column(Text, nullable=True)          # JSON-encoded or text additional notes
    trigger_reason = Column(Text, nullable=True)
    recommended_actions = Column(Text, nullable=True)  # JSON-encoded list of actions
    status = Column(String(32), nullable=False, default="active")  # active, acknowledged, resolved, expired, snooze, false_alarm
    feedback_notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(String(128), nullable=True)

    run = relationship("PipelineRun", back_populates="alerts")
    tasks = relationship("Task", back_populates="alert")

    def to_dict(self) -> dict:
        parsed_series = None
        if self.series_data:
            try:
                parsed_series = json.loads(self.series_data)
            except Exception:
                parsed_series = None

        parsed_actions = []
        if self.recommended_actions:
            try:
                parsed_actions = json.loads(self.recommended_actions)
            except Exception:
                parsed_actions = [self.recommended_actions]

        d_type = (self.disease_type or "malaria").lower()
        d_labels = {
            "malaria": "Malaria",
            "dengue": "Dengue",
            "diarrhoea": "Diarrhoeal Disease",
            "heat": "Heat-Related Health Risk",
        }

        return {
            "id": self.id,
            "unit_id": self.unit_id,
            "disease_type": d_type,
            "disease_label": d_labels.get(d_type, d_type.title()),
            "risk": self.risk,
            "confidence": self.confidence,
            "forecast_period": self.forecast_period,
            "method_used": self.method_used,
            "run_id": self.run_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "series": parsed_series,
            "details": self.details,
            "trigger_reason": self.trigger_reason or self.details,
            "recommended_actions": parsed_actions,
            "status": self.status,
            "feedback_notes": self.feedback_notes,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "updated_by": self.updated_by,
        }


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True, index=True)
    disease_type = Column(String(32), nullable=False, default="malaria", index=True)  # malaria, dengue, diarrhoea, heat
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    steps = Column(Text, nullable=False)  # JSON or text list of steps
    owner = Column(String(128), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_by = Column(String(128), nullable=True, default="Supervisor [SAMPLE]")
    priority = Column(String(32), nullable=False, default="High")  # Low, Medium, High, Critical
    district_id = Column(String(64), nullable=True, index=True)
    block_id = Column(String(64), nullable=True, index=True)
    village_id = Column(String(64), nullable=True, index=True)
    location_name = Column(String(255), nullable=True)
    deadline = Column(DateTime, nullable=False)
    status = Column(String(32), nullable=False, default="sent")  # sent, acknowledged, in_progress, done, needs_help, escalated, cancelled
    completion_notes = Column(Text, nullable=True)
    evidence_attachment = Column(Text, nullable=True)
    encounter_id = Column(Integer, ForeignKey("patient_encounters.id"), nullable=True, index=True)
    follow_up_key = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    alert = relationship("Alert", back_populates="tasks")
    events = relationship("TaskEvent", back_populates="task", order_by="TaskEvent.timestamp.asc()", cascade="all, delete-orphan")
    reports = relationship("FieldReport", back_populates="task", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        parsed_steps = []
        if self.steps:
            try:
                parsed_steps = json.loads(self.steps)
            except Exception:
                parsed_steps = [s.strip() for s in self.steps.split("\n") if s.strip()]

        d_type = (self.disease_type or (self.alert.disease_type if self.alert else None) or "malaria").lower()
        d_labels = {
            "malaria": "Malaria",
            "dengue": "Dengue",
            "diarrhoea": "Diarrhoeal Disease",
            "heat": "Heat-Related Health Risk",
        }

        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "disease_type": d_type,
            "disease_label": d_labels.get(d_type, d_type.title()),
            "title": self.title,
            "description": self.description or self.title,
            "instructions": self.instructions or ("; ".join(parsed_steps) if parsed_steps else ""),
            "steps": parsed_steps,
            "owner": self.owner,
            "owner_id": self.owner_id,
            "assigned_by": self.assigned_by or "Supervisor [SAMPLE]",
            "priority": self.priority or "High",
            "district_id": self.district_id,
            "block_id": self.block_id,
            "village_id": self.village_id,
            "location_name": self.location_name,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status,
            "completion_notes": self.completion_notes,
            "evidence_attachment": self.evidence_attachment,
            "encounter_id": self.encounter_id,
            "follow_up_key": self.follow_up_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "events": [event.to_dict() for event in self.events] if self.events else [],
        }


class TaskEvent(Base):
    __tablename__ = "task_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    event = Column(String(64), nullable=False)
    actor = Column(String(128), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    task = relationship("Task", back_populates="events")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task_id": self.task_id,
            "event": self.event,
            "actor": self.actor,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "notes": self.notes,
        }


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=True, index=True)
    password_hash = Column(String(256), nullable=True)
    name = Column(String(128), nullable=False)
    role = Column(String(64), nullable=False)  # district_officer, block_supervisor, mitanin
    unit_id = Column(String(64), nullable=True)
    district_id = Column(String(64), nullable=True, index=True)
    block_id = Column(String(64), nullable=True, index=True)
    village_id = Column(String(64), nullable=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    phone = Column(String(32), nullable=True)
    designation = Column(String(128), nullable=True)
    preferred_language = Column(String(16), nullable=False, default="en")

    def get_portal_role(self) -> str:
        """Maps internal role to employee portal role ('supervisor' or 'field_employee')."""
        if self.role in ("block_supervisor", "district_officer", "supervisor"):
            return "supervisor"
        return "field_employee"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "role": self.role,
            "portal_role": self.get_portal_role(),
            "role_label": "Supervisor" if self.get_portal_role() == "supervisor" else "Field Employee / Mitanin",
            "unit_id": self.unit_id,
            "district_id": self.district_id or "DIST_SAMPLE",
            "block_id": self.block_id or (self.unit_id if self.unit_id and self.unit_id.startswith("BLK_") else None),
            "village_id": self.village_id,
            "supervisor_id": self.supervisor_id,
            "phone": self.phone,
            "designation": self.designation,
            "preferred_language": self.preferred_language or "en",
        }


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User")


class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    disease_type = Column(String(32), nullable=False, default="malaria", index=True)  # malaria, dengue, diarrhoea, heat
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employee_name = Column(String(128), nullable=False)
    district_id = Column(String(64), nullable=False, index=True)
    block_id = Column(String(64), nullable=False, index=True)
    village_id = Column(String(64), nullable=True, index=True)
    location_name = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    households_visited = Column(Integer, nullable=False, default=0)
    rdt_conducted = Column(Integer, nullable=False, default=0)
    positive_cases = Column(Integer, nullable=False, default=0)
    suspected_cases = Column(Integer, nullable=False, default=0)
    emerging_concern = Column(Boolean, nullable=False, default=False)
    stagnant_water_sites = Column(Integer, nullable=False, default=0)
    nets_distributed = Column(Integer, nullable=False, default=0)
    observations = Column(Text, nullable=False)
    evidence_notes = Column(Text, nullable=True)
    review_status = Column(String(32), nullable=False, default="pending_review")  # pending_review, approved, rejected, corrections_requested
    reviewer_name = Column(String(128), nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)

    task = relationship("Task", back_populates="reports")
    employee = relationship("User")

    def to_dict(self) -> dict:
        d_type = (self.disease_type or "malaria").lower()
        d_labels = {
            "malaria": "Malaria",
            "dengue": "Dengue",
            "diarrhoea": "Diarrhoeal Disease",
            "heat": "Heat-Related Health Risk",
        }
        return {
            "id": self.id,
            "task_id": self.task_id,
            "disease_type": d_type,
            "disease_label": d_labels.get(d_type, d_type.title()),
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "district_id": self.district_id,
            "block_id": self.block_id,
            "village_id": self.village_id,
            "location_name": self.location_name,
            "title": self.title,
            "households_visited": self.households_visited,
            "rdt_conducted": self.rdt_conducted,
            "positive_cases": self.positive_cases,
            "suspected_cases": self.suspected_cases or 0,
            "emerging_concern": bool(self.emerging_concern),
            "stagnant_water_sites": self.stagnant_water_sites,
            "nets_distributed": self.nets_distributed,
            "observations": self.observations,
            "evidence_notes": self.evidence_notes,
            "review_status": self.review_status,
            "reviewer_name": self.reviewer_name,
            "review_notes": self.review_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    block_id = Column(String(64), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(64), nullable=False, default="task")  # task, alert, report_review
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "block_id": self.block_id,
            "title": self.title,
            "message": self.message,
            "category": self.category,
            "is_read": bool(self.is_read),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SimulatedClock(Base):
    __tablename__ = "simulated_clock"

    id = Column(Integer, primary_key=True, default=1)
    current_time = Column(DateTime, nullable=False)
    anchor_time = Column(DateTime, nullable=False)

    def to_dict(self) -> dict:
        return {
            "current_time": self.current_time.isoformat() if self.current_time else None,
            "anchor_time": self.anchor_time.isoformat() if self.anchor_time else None,
        }


class TranslatedTaskTemplate(Base):
    __tablename__ = "translated_task_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_key = Column(String(64), unique=True, nullable=False, index=True)
    disease_type = Column(String(32), nullable=False, default="malaria", index=True)
    title_en = Column(Text, nullable=False)
    title_hi = Column(Text, nullable=False)
    title_hne = Column(Text, nullable=False)
    instructions_en = Column(Text, nullable=False)
    instructions_hi = Column(Text, nullable=False)
    instructions_hne = Column(Text, nullable=False)
    safety_en = Column(Text, nullable=True)
    safety_hi = Column(Text, nullable=True)
    safety_hne = Column(Text, nullable=True)
    review_status = Column(String(32), nullable=False, default="reviewed")  # reviewed, community_draft, updated_by_admin
    updated_by = Column(String(128), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "template_key": self.template_key,
            "disease_type": self.disease_type,
            "translations": {
                "en": {
                    "title": self.title_en,
                    "instructions": self.instructions_en,
                    "safety": self.safety_en or "",
                },
                "hi": {
                    "title": self.title_hi,
                    "instructions": self.instructions_hi,
                    "safety": self.safety_hi or "",
                },
                "hne": {
                    "title": self.title_hne,
                    "instructions": self.instructions_hne,
                    "safety": self.safety_hne or "",
                },
            },
            "review_status": self.review_status,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatbotAuditLog(Base):
    __tablename__ = "chatbot_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    portal_role = Column(String(32), nullable=False, default="public")
    language = Column(String(16), nullable=False, default="en")
    district_id = Column(String(64), nullable=True)
    block_id = Column(String(64), nullable=True)
    village_id = Column(String(64), nullable=True)
    user_message = Column(Text, nullable=False)
    provider_status = Column(String(64), nullable=False)
    action_executed = Column(String(128), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class VillageVisit(Base):
    __tablename__ = "village_visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    village_id = Column(String(64), nullable=False, index=True)
    block_id = Column(String(64), nullable=False, index=True)
    district_id = Column(String(64), nullable=False, index=True)
    household_id = Column(String(64), nullable=False, index=True)
    household_name = Column(String(128), nullable=False)
    hamlet = Column(String(128), nullable=True)
    head_of_household = Column(String(128), nullable=True)
    family_size = Column(Integer, nullable=False, default=5)
    priority = Column(String(32), nullable=False, default="routine")  # urgent, high, routine, water
    visit_reason = Column(String(255), nullable=False)
    scheduled_date = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="scheduled")  # scheduled, in_progress, completed, cancelled
    assigned_mitanin_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_mitanin_name = Column(String(128), nullable=True)
    last_visit_days_ago = Column(Integer, nullable=False, default=0)
    last_visit_notes = Column(Text, nullable=True)
    vulnerable_members = Column(Text, nullable=True)  # JSON-encoded array of member objects
    protocols = Column(Text, nullable=True)  # JSON-encoded array of field checklist protocol objects
    dialect = Column(String(32), nullable=False, default="Halbi")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        parsed_vulnerable = []
        if self.vulnerable_members:
            try:
                parsed_vulnerable = json.loads(self.vulnerable_members)
            except Exception:
                parsed_vulnerable = []

        parsed_protocols = []
        if self.protocols:
            try:
                parsed_protocols = json.loads(self.protocols)
            except Exception:
                parsed_protocols = []

        return {
            "id": self.id,
            "village_id": self.village_id,
            "block_id": self.block_id,
            "district_id": self.district_id,
            "household_id": self.household_id,
            "household_name": self.household_name,
            "hamlet": self.hamlet,
            "head_of_household": self.head_of_household,
            "family_size": self.family_size,
            "priority": self.priority,
            "visit_reason": self.visit_reason,
            "scheduled_date": self.scheduled_date,
            "status": self.status,
            "assigned_mitanin_id": self.assigned_mitanin_id,
            "assigned_mitanin_name": self.assigned_mitanin_name,
            "last_visit_days_ago": self.last_visit_days_ago,
            "last_visit_notes": self.last_visit_notes,
            "vulnerable_members": parsed_vulnerable,
            "protocols": parsed_protocols,
            "dialect": self.dialect,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PatientEncounter(Base):
    __tablename__ = "patient_encounters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    visit_id = Column(Integer, ForeignKey("village_visits.id"), nullable=True, index=True)
    household_id = Column(String(64), nullable=False, index=True)
    household_name = Column(String(128), nullable=False)
    patient_name = Column(String(128), nullable=False)
    patient_identifier = Column(String(64), nullable=True)  # RCH-ID, ABHA
    age = Column(Integer, nullable=False, default=26)
    gender = Column(String(16), nullable=False, default="Female")
    gestation_weeks = Column(Float, nullable=True)
    district_id = Column(String(64), nullable=False, index=True)
    block_id = Column(String(64), nullable=False, index=True)
    village_id = Column(String(64), nullable=True, index=True)
    mitanin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mitanin_name = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="in_progress")  # in_progress, completed, escalated
    elapsed_seconds = Column(Integer, nullable=False, default=0)
    danger_signs = Column(Text, nullable=True)  # JSON
    vitals = Column(Text, nullable=True)  # JSON
    optical_strip_result = Column(Text, nullable=True)  # JSON
    audio_notes = Column(Text, nullable=True)  # JSON
    supplies = Column(Text, nullable=True)  # JSON
    emergency_escalation = Column(Boolean, nullable=False, default=False)
    emergency_escalation_details = Column(Text, nullable=True)  # JSON
    submission_token = Column(String(64), nullable=True, index=True)  # Idempotency token for creation
    follow_up_schedule = Column(Text, nullable=True)  # JSON array of follow-up appointments/transport
    attestation = Column(Text, nullable=True)  # JSON object with consent, dialect audio token, worker sign
    discharge_summary = Column(Text, nullable=True)  # JSON object with counseling, key findings
    completion_token = Column(String(64), nullable=True, index=True)  # Idempotency token for finalization
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        def _parse(field, default_val=None):
            if not field:
                return default_val if default_val is not None else {}
            try:
                return json.loads(field)
            except Exception:
                return default_val if default_val is not None else {}

        return {
            "id": self.id,
            "visit_id": self.visit_id,
            "household_id": self.household_id,
            "household_name": self.household_name,
            "patient_name": self.patient_name,
            "patient_identifier": self.patient_identifier,
            "age": self.age,
            "gender": self.gender,
            "gestation_weeks": self.gestation_weeks,
            "district_id": self.district_id,
            "block_id": self.block_id,
            "village_id": self.village_id,
            "mitanin_id": self.mitanin_id,
            "mitanin_name": self.mitanin_name,
            "status": self.status,
            "elapsed_seconds": self.elapsed_seconds,
            "danger_signs": _parse(self.danger_signs),
            "vitals": _parse(self.vitals),
            "optical_strip_result": _parse(self.optical_strip_result),
            "audio_notes": _parse(self.audio_notes),
            "supplies": _parse(self.supplies),
            "emergency_escalation": bool(self.emergency_escalation),
            "emergency_escalation_details": _parse(self.emergency_escalation_details),
            "submission_token": self.submission_token,
            "follow_up_schedule": _parse(self.follow_up_schedule, []),
            "attestation": _parse(self.attestation),
            "discharge_summary": _parse(self.discharge_summary),
            "completion_token": self.completion_token,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class PatientScreening(Base):
    __tablename__ = "patient_screenings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    encounter_id = Column(Integer, ForeignKey("patient_encounters.id"), nullable=True, index=True)
    patient_name = Column(String(128), nullable=False)
    patient_identifier = Column(String(64), nullable=True)
    age = Column(Integer, nullable=False, default=26)
    gender = Column(String(16), nullable=False, default="Female")
    gestation_weeks = Column(Float, nullable=True)
    district_id = Column(String(64), nullable=False, index=True)
    block_id = Column(String(64), nullable=False, index=True)
    village_id = Column(String(64), nullable=True, index=True)
    mitanin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mitanin_name = Column(String(128), nullable=False)
    mode = Column(String(32), nullable=False, default="standard")  # standard, highrisk
    vitals = Column(Text, nullable=True)  # JSON
    danger_signs = Column(Text, nullable=True)  # JSON
    risk_category = Column(String(32), nullable=False, default="Moderate")  # High, Elevated, Moderate, Normal
    composite_risk_score = Column(Integer, nullable=False, default=68)
    dual_validation = Column(Text, nullable=True)  # JSON: Tier A statutory protocol + Tier B heuristic model
    feature_weights = Column(Text, nullable=True)  # JSON: explainable weights
    prescribed_pathway = Column(Text, nullable=True)  # JSON: specialist, transit, labs, meds
    submission_token = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        def _parse(field, default_val=None):
            if not field:
                return default_val if default_val is not None else {}
            try:
                return json.loads(field)
            except Exception:
                return default_val if default_val is not None else {}

        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "patient_name": self.patient_name,
            "patient_identifier": self.patient_identifier,
            "age": self.age,
            "gender": self.gender,
            "gestation_weeks": self.gestation_weeks,
            "district_id": self.district_id,
            "block_id": self.block_id,
            "village_id": self.village_id,
            "mitanin_id": self.mitanin_id,
            "mitanin_name": self.mitanin_name,
            "mode": self.mode,
            "vitals": _parse(self.vitals),
            "danger_signs": _parse(self.danger_signs),
            "risk_category": self.risk_category,
            "composite_risk_score": self.composite_risk_score,
            "dual_validation": _parse(self.dual_validation),
            "feature_weights": _parse(self.feature_weights, []),
            "prescribed_pathway": _parse(self.prescribed_pathway),
            "submission_token": self.submission_token,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_identifier = Column(String(64), unique=True, nullable=False, index=True)
    abha_number = Column(String(32), nullable=True, index=True)
    provisional_id = Column(String(64), nullable=True, index=True)
    aadhaar_masked = Column(String(32), nullable=True)
    full_name_en = Column(String(128), nullable=False)
    full_name_hi = Column(String(128), nullable=True)
    age = Column(Integer, nullable=False, default=28)
    dob = Column(String(32), nullable=True)
    gender = Column(String(16), nullable=False, default="Female")
    contact_number = Column(String(32), nullable=True)
    contact_owner = Column(String(128), nullable=True)
    primary_dialect = Column(String(32), nullable=False, default="Halbi")
    gram_panchayat = Column(String(128), nullable=True, default="Karanji")
    faliya_para = Column(String(128), nullable=True, default="Patelpara, Sector 04")
    assigned_mitanin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_mitanin_name = Column(String(128), nullable=True, default="Sunita Mandavi")
    household_id = Column(String(64), nullable=True, index=True)
    district_id = Column(String(64), nullable=False, index=True, default="LGD_DIST_374")
    block_id = Column(String(64), nullable=False, index=True, default="LGD_BLK_3595")
    village_id = Column(String(64), nullable=True, index=True)
    ration_card_tier = Column(String(32), nullable=True, default="AAY")
    sickle_cell_trait = Column(String(32), nullable=True, default="Carrier")
    currently_pregnant = Column(Boolean, nullable=False, default=False)
    lmp_date = Column(String(32), nullable=True)
    gestational_age_weeks = Column(Float, nullable=True)
    edd = Column(String(32), nullable=True)
    baseline_vitals = Column(Text, nullable=True)  # JSON
    consent_audio_verified = Column(Boolean, nullable=False, default=True)
    consent_language = Column(String(16), nullable=True, default="halbi")
    informed_consent_certified = Column(Boolean, nullable=False, default=True)
    thumbprint_verified = Column(Boolean, nullable=False, default=True)
    mitanin_token_signature = Column(String(64), nullable=True, default="#K-VERMA")
    registered_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_by_name = Column(String(128), nullable=False)
    registration_channel = Column(String(32), nullable=False, default="subcenter")
    submission_token = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        def _parse(field):
            if not field:
                return {}
            try:
                return json.loads(field)
            except Exception:
                return {}

        return {
            "id": self.id,
            "patient_identifier": self.patient_identifier,
            "abha_number": self.abha_number,
            "provisional_id": self.provisional_id,
            "aadhaar_masked": self.aadhaar_masked,
            "full_name_en": self.full_name_en,
            "full_name_hi": self.full_name_hi,
            "age": self.age,
            "dob": self.dob,
            "gender": self.gender,
            "contact_number": self.contact_number,
            "contact_owner": self.contact_owner,
            "primary_dialect": self.primary_dialect,
            "gram_panchayat": self.gram_panchayat,
            "faliya_para": self.faliya_para,
            "assigned_mitanin_id": self.assigned_mitanin_id,
            "assigned_mitanin_name": self.assigned_mitanin_name,
            "household_id": self.household_id,
            "district_id": self.district_id,
            "block_id": self.block_id,
            "village_id": self.village_id,
            "ration_card_tier": self.ration_card_tier,
            "sickle_cell_trait": self.sickle_cell_trait,
            "currently_pregnant": bool(self.currently_pregnant),
            "lmp_date": self.lmp_date,
            "gestational_age_weeks": self.gestational_age_weeks,
            "edd": self.edd,
            "baseline_vitals": _parse(self.baseline_vitals),
            "consent_audio_verified": bool(self.consent_audio_verified),
            "consent_language": self.consent_language,
            "informed_consent_certified": bool(self.informed_consent_certified),
            "thumbprint_verified": bool(self.thumbprint_verified),
            "mitanin_token_signature": self.mitanin_token_signature,
            "registered_by_id": self.registered_by_id,
            "registered_by_name": self.registered_by_name,
            "registration_channel": self.registration_channel,
            "submission_token": self.submission_token,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PatientRegistrationAudit(Base):
    __tablename__ = "patient_registration_audits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    patient_identifier = Column(String(64), nullable=False, index=True)
    action = Column(String(64), nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    user_name = Column(String(128), nullable=True)
    portal_role = Column(String(32), nullable=False, default="field_employee")
    district_id = Column(String(64), nullable=True)
    block_id = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        def _parse(field):
            if not field:
                return {}
            try:
                return json.loads(field)
            except Exception:
                return {}

        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_identifier": self.patient_identifier,
            "action": self.action,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "portal_role": self.portal_role,
            "district_id": self.district_id,
            "block_id": self.block_id,
            "details": _parse(self.details),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


