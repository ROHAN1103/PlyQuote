from fastapi import APIRouter, Depends

from app.api.deps import verify_csrf
from app.api.v1 import auth

# CSRF is enforced for every unsafe method on every v1 route, including future ones.
api_router = APIRouter(dependencies=[Depends(verify_csrf)])
api_router.include_router(auth.router)
