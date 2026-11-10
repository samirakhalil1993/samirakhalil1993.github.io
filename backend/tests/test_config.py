import pytest

from app.config import Settings


def test_defaults_when_nothing_is_set():
    settings = Settings.from_env({})
    assert settings.groq_api_key is None
    assert settings.groq_model == "openai/gpt-oss-120b"
    assert settings.provider == "groq"
    assert settings.allowed_origins == ("http://localhost:5173", "http://localhost:4173")
    assert settings.requests_per_hour == 20
    assert settings.requests_per_day == 300
    assert settings.max_message_chars == 500
    assert settings.max_messages == 31
    assert settings.max_context_chars == 4000
    assert settings.max_history_messages == 6
    assert settings.max_history_chars == 2000
    assert settings.max_answer_tokens == 350
    assert settings.trust_proxy is False


def test_values_are_read_from_the_environment():
    settings = Settings.from_env(
        {
            "GROQ_API_KEY": "gsk_test",
            "GROQ_MODEL": "some/model",
            "PROVIDER": "fake",
            "ALLOWED_ORIGINS": "https://a.example, https://b.example ,",
            "REQUESTS_PER_HOUR": "5",
            "REQUESTS_PER_DAY": "50",
            "TRUST_PROXY": "true",
        }
    )
    assert settings.groq_api_key == "gsk_test"
    assert settings.groq_model == "some/model"
    assert settings.provider == "fake"
    assert settings.allowed_origins == ("https://a.example", "https://b.example")
    assert settings.requests_per_hour == 5
    assert settings.requests_per_day == 50
    assert settings.trust_proxy is True


def test_an_empty_key_counts_as_no_key():
    assert Settings.from_env({"GROQ_API_KEY": "  "}).groq_api_key is None


def test_a_number_that_is_not_a_number_names_the_variable():
    with pytest.raises(ValueError, match="REQUESTS_PER_HOUR"):
        Settings.from_env({"REQUESTS_PER_HOUR": "many"})


def test_a_number_below_one_is_rejected():
    with pytest.raises(ValueError, match="REQUESTS_PER_DAY"):
        Settings.from_env({"REQUESTS_PER_DAY": "0"})


def test_an_unknown_provider_is_rejected():
    with pytest.raises(ValueError, match="PROVIDER"):
        Settings.from_env({"PROVIDER": "magic"})


def test_the_key_is_never_shown_when_settings_are_printed():
    settings = Settings.from_env({"GROQ_API_KEY": "gsk_secret_value"})
    assert "gsk_secret_value" not in repr(settings)
    assert "gsk_secret_value" not in str(settings)
