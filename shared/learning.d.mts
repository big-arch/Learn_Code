export interface LearningEvent {lesson:string;version:number;kind:'visit'|'hint'|'attempt';variant:'lesson'|'review';passed:boolean;helped:boolean;at:string}
export function normalizeEvidence(input:unknown):Record<string,LearningEvent>
export function validEvidence(input:unknown):boolean
export function mergeEvidence(a:unknown,b:unknown):Record<string,LearningEvent>
