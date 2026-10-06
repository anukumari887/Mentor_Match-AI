from pydantic import BaseModel, ConfigDict, Field, model_validator


class AvailabilityWindow(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    day_of_week: int = Field(alias="dayOfWeek", ge=0, le=6)
    start_time: str = Field(alias="startTime", pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")
    end_time: str = Field(alias="endTime", pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")

    @model_validator(mode="after")
    def validate_order(self):
        if self.start_time >= self.end_time:
            raise ValueError("Availability start time must be before end time.")
        return self


class LearnerInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    wanted_skills: list[str] = Field(default_factory=list, alias="wantedSkills", max_length=100)
    known_skills: list[str] = Field(default_factory=list, alias="knownSkills", max_length=100)
    goals: str = Field(default="", max_length=500)
    level: str = Field(default="beginner", pattern=r"^(beginner|intermediate|advanced)$")
    budget_per_hour: int = Field(default=0, alias="budgetPerHour", ge=0)
    availability: list[AvailabilityWindow] = Field(default_factory=list, max_length=100)


class MentorInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(min_length=1, max_length=100)
    skills: list[str] = Field(default_factory=list, max_length=100)
    headline: str = Field(default="", max_length=120)
    bio: str = Field(default="", max_length=1500)
    experience_years: int = Field(alias="experienceYears", ge=0, le=60)
    price_per_hour: int = Field(alias="pricePerHour", ge=100, le=20000)
    availability: list[AvailabilityWindow] = Field(default_factory=list, max_length=100)
    rating_avg: float = Field(default=0, alias="ratingAvg", ge=0, le=5)
    rating_count: int = Field(default=0, alias="ratingCount", ge=0)


class RecommendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    learner: LearnerInput
    mentors: list[MentorInput] = Field(default_factory=list, max_length=500)
    limit: int = Field(default=5, ge=1, le=50)