from fastapi import APIRouter, BackgroundTasks
from app.services.simulator import DisasterSimulator

router = APIRouter(prefix="/simulator", tags=["Simulator"])

@router.post("/start")
async def start_simulator(background_tasks: BackgroundTasks):
    if DisasterSimulator.is_running:
        return {"status": "already_running", "message": "Disaster simulation is already in progress."}

    background_tasks.add_task(DisasterSimulator.run_simulation)
    return {"status": "started", "message": "Disaster simulation started in background."}

@router.post("/stop")
async def stop_simulator():
    DisasterSimulator.is_running = False
    return {"status": "stopped", "message": "Disaster simulation stopped."}

@router.get("/status")
def get_simulator_status():
    return {"is_running": DisasterSimulator.is_running}
