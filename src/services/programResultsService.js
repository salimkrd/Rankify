import { createResultService } from "./resultsServiceFactory.js";

const service = createResultService("program_results");

export const listProgramResultsByEvent = service.listResultsByEvent;
export const getProgramResultById = service.getResultById;
export const createProgramResult = service.createResult;
export const updateProgramResult = service.updateResult;
export const deleteProgramResult = service.deleteResult;
