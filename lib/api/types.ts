export interface ProcessingStage {
  stage_id: number;
  stage_name: string;
  stage_order: number;
}

export interface ProcessingStageCreate {
  stage_name: string;
  stage_order: number;
}

export type ProcessingStageUpdate = Partial<ProcessingStageCreate>;

export interface ScenarioResult {
  results_id: string;
  scenario_id: string;
  execution_number: number;
  simulated_value: string;
  baseline_value: string;
  value_difference: string;
  /** null when baseline_value is 0. Already a percent, e.g. "5.882353" = 5.88%. */
  percentage_difference: string | null;
  calculated_at: string;
}

export interface Scenario {
  scenario_id: string;
  batch_id: string;
  baseline_calculation_id: string;
  created_by: string;
  scenario_name: string;
  assumed_quantity: string;
  /** Fraction 0–1. */
  assumed_grade: string;
  /** Fraction 0–1. */
  assumed_recovery: string;
  assumed_price: string;
  assumed_stage_id: number;
  price_unit: string;
  currency: string;
}

// Read-only lookups owned by other modules; only the fields we use.
export interface MineralBatch {
  batch_id: string;
  batch_code: string;
}

export interface ValueCalculation {
  stage_id: number;
  calculated_at: string;
  calculation_id: string;
  batch_id: string;
  quantity: string;
  grade: string;
  recovery: string | null;
  reference_price: string;
  price_unit: string;
  currency: string;
  calculated_value: string;
}

/** One recorded stage of a batch (backend: BatchHistoryRead, feature/batch_history). */
export interface BatchHistoryRecord {
  history_id: string;
  batch_id: string;
  current_stage_id: number;
  recorded_by: string;
  quantity_tonnes: string | null;
  /** Fraction 0–1. */
  grade: string | null;
  /** Fraction 0–1. */
  recovery: string | null;
  reason: string | null;
  source_type: string | null;
  source_location: string | null;
  feed_quantity_tonnes: string | null;
  /** Fraction 0–1. */
  feed_grade: string | null;
  output_quantity_tonnes: string | null;
  /** Fraction 0–1. */
  output_grade: string | null;
  /** Fraction 0–1. */
  moisture: string | null;
  assay_document_url: string | null;
  occurred_at: string;
  recorded_at: string;
}
export type AssessmentOutcome =
  "VIABLE" | "CONDITIONALLY_VIABLE" | "NOT_VIABLE";

export type FindingOutcome = "PASS" | "WARNING" | "FAIL" | "NOT_ASSESSED";

export interface AssessmentFinding {
  rule_code: string;
  category: string;
  outcome: FindingOutcome;
  severity: string;
  message: string;
  actual_value: string | null;
  expected_value: string | null;
}

export interface AssessmentContext {
  technical_recovery_min?: number | null;
  technical_recovery_max?: number | null;
  required_capacity_tonnes?: number | null;
  available_capacity_tonnes?: number | null;
  regulatory_status?: string | null;
  infrastructure_status?: string | null;
  operation_specific_technical_evidence?: boolean | null;
  cost_data_complete?: boolean | null;
  downside_price?: number | null;
}

export interface ScenarioDecision {
  id: string;
  scenario_id: string;
  scenario_result_id: string;
  lifecycle_state: string;
  assessment_outcome: AssessmentOutcome;
  recommendation: "PROCEED" | "PROCEED_AFTER_VALIDATION" | "REVISE_SCENARIO";
  assessment_summary: string;
  findings: AssessmentFinding[];
  recommendations: string[];
  assessed_at: string;
  created_at: string;
  updated_at: string;
}
