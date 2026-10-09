from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Uses the frontend's camelCase field names and forbids unknown fields."""

    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, extra="forbid")
