import pytest
import logging
import psycopg2  # Assuming you're using psycopg2 for PostgreSQL
from dotenv import load_dotenv
import os
load_dotenv()

# Configure logging 
logging.basicConfig(level=logging.INFO) 
logger = logging.getLogger(__name__)

# Database fixture
@pytest.fixture(scope="function") 
def db():
    """Yields a database connection for testing."""
    try:
        db_user = os.environ.get('TEST_DB_USER')
        db_password = os.environ.get('TEST_DB_PASSWORD')
        db_host = os.environ.get('TEST_DB_HOST')
        db_port = os.environ.get('TEST_DB_PORT')
        db_name = os.environ.get('TEST_DB_NAME')

        conn = psycopg2.connect(
            db_user = os.environ.get('TEST_DB_USER')
            db_password = os.environ.get('TEST_DB_PASSWORD')
            db_host = os.environ.get('TEST_DB_HOST')
            db_port = os.environ.get('TEST_DB_PORT')
            db_name = os.environ.get('TEST_DB_NAME')
        )
        yield conn  # Provide the connection to the test

    except psycopg2.Error as e:
        logger.error(f"Error connecting to the database: {e}")
        raise  # Re-raise the exception so the test fails

    finally:
        if conn:
            conn.close()
