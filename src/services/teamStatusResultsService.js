import { createResultService } from "./resultsServiceFactory.js";

const service = createResultService("team_status_results");

export const listTeamStatusResultsByEvent = service.listResultsByEvent;
export const getTeamStatusResultById = service.getResultById;
export const createTeamStatusResult = service.createResult;
export const updateTeamStatusResult = service.updateResult;
export const deleteTeamStatusResult = service.deleteResult;
