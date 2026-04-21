import { NextRequest, NextResponse } from "next/server";
import {
  startWorker,
  stopWorker,
  pauseWorker,
  resumeWorker,
  getWorkerInfo,
} from "@/worker";

export async function GET() {
  return NextResponse.json(getWorkerInfo());
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case "start":
        startWorker();
        break;
      case "stop":
        stopWorker();
        break;
      case "pause":
        pauseWorker();
        break;
      case "resume":
        resumeWorker();
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, stop, pause, resume" },
          { status: 400 }
        );
    }

    return NextResponse.json(getWorkerInfo());
  } catch {
    return NextResponse.json(
      { error: "Error controlling worker" },
      { status: 500 }
    );
  }
}
