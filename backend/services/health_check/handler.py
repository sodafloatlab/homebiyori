from mangum import Mangum
from backend.services.health-check.main import app

handler = Mangum(app)
