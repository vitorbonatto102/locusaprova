import catalogData from "@/data/study-tracks.json";

export type ContentStatus = "complete" | "planned";
export type StudyFamily = {
  id: string;
  label: string;
  description: string;
  pathways: { id: string; label: string; description: string }[];
};
export type StudyTrack = {
  id: string;
  examFamilyId: string;
  examFamilyLabel: string;
  stageId: string;
  stageLabel: string;
  specializationId: string | null;
  specializationLabel: string;
  shortLabel: string;
  contentStatus: ContentStatus;
  contentNote: string;
  examCount: number;
  simulationMode: "objective-screen" | "paper-guided" | "hybrid";
  subjects: string[];
  difficultyOptions: string[];
  capabilities: string[];
};

export const studyCatalog = catalogData as {
  activeTrackId: string;
  families: StudyFamily[];
  capabilityLabels: Record<string, string>;
  tracks: StudyTrack[];
};

export const ACTIVE_TRACK_ID = studyCatalog.activeTrackId;
export const activeTrack = studyCatalog.tracks.find((track) => track.id === ACTIVE_TRACK_ID) ?? studyCatalog.tracks[0];

export function getStudyTrack(trackId = ACTIVE_TRACK_ID) {
  return studyCatalog.tracks.find((track) => track.id === trackId) ?? null;
}

export function getTracksForPath(familyId: string, stageId: string) {
  return studyCatalog.tracks.filter((track) => track.examFamilyId === familyId && track.stageId === stageId);
}

export function getTrackForSelection(familyId: string, stageId: string, specializationId?: string | null) {
  return studyCatalog.tracks.find((track) => track.examFamilyId === familyId && track.stageId === stageId && (specializationId ? track.specializationId === specializationId : true)) ?? null;
}

export function isTrackAvailable(trackId: string) {
  return getStudyTrack(trackId)?.contentStatus === "complete";
}
