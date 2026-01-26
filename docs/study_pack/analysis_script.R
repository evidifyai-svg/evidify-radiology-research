# ============================================================================
# Evidify Study Analysis Script
# R Analysis Skeleton for BRPLL RadAI Study
# ============================================================================
#
# This script provides a complete analysis pipeline for Evidify export data.
# Assumes data exported in ZIP format with:
#   - trial_manifest.json
#   - events.jsonl
#   - ledger.json
#   - derived_metrics.csv
#   - verifier_output.json
#   - codebook.md
#
# Required packages: tidyverse, jsonlite, lme4, iMRMC, ggplot2, pROC
# ============================================================================

# =========================
# 1. SETUP AND DATA LOADING
# =========================

library(tidyverse)
library(jsonlite)
library(lme4)
library(ggplot2)

# Set working directory to data folder
# setwd("path/to/exports")

# Function to load a single export pack
load_export_pack <- function(zip_path) {
  temp_dir <- tempdir()
  unzip(zip_path, exdir = temp_dir)
  
  # Load manifest
  manifest <- fromJSON(file.path(temp_dir, "trial_manifest.json"))
  
  # Load events
  events <- read_lines(file.path(temp_dir, "events.jsonl")) %>%
    map(fromJSON) %>%
    bind_rows()
  
  # Load derived metrics
  metrics <- read_csv(file.path(temp_dir, "derived_metrics.csv"), 
                      show_col_types = FALSE)
  
  # Load ledger for verification
  ledger <- fromJSON(file.path(temp_dir, "ledger.json"))
  
  list(
    manifest = manifest,
    events = events,
    metrics = metrics,
    ledger = ledger
  )
}

# Load all export packs from a directory
load_all_exports <- function(export_dir) {
  zip_files <- list.files(export_dir, pattern = "\\.zip$", full.names = TRUE)
  
  all_data <- map(zip_files, load_export_pack)
  
  # Combine all metrics
  combined_metrics <- map_dfr(all_data, ~ .x$metrics)
  
  # Combine all events
  combined_events <- map_dfr(all_data, ~ .x$events)
  
  list(
    metrics = combined_metrics,
    events = combined_events,
    n_sessions = length(zip_files)
  )
}

# Example usage:
# data <- load_all_exports("./exports")


# ============================
# 2. DATA VERIFICATION
# ============================

verify_data_integrity <- function(data) {
  # Check for required columns
  required_cols <- c("sessionId", "caseId", "initialBirads", "finalBirads", 
                     "aiBirads", "adda", "addaDenominator")
  
  missing <- setdiff(required_cols, names(data$metrics))
  if (length(missing) > 0) {
    warning(paste("Missing columns:", paste(missing, collapse = ", ")))
  }
  
  # Summary statistics
  cat("Data Summary:\n")
  cat("  Total sessions:", n_distinct(data$metrics$sessionId), "\n")
  cat("  Total cases:", nrow(data$metrics), "\n")
  cat("  Cases with ADDA eligible:", sum(data$metrics$addaDenominator, na.rm = TRUE), "\n")
  
  # Check for data quality issues
  issues <- list(
    missing_initial = sum(is.na(data$metrics$initialBirads)),
    missing_final = sum(is.na(data$metrics$finalBirads)),
    missing_ai = sum(is.na(data$metrics$aiBirads))
  )
  
  if (any(issues > 0)) {
    cat("\nData Quality Issues:\n")
    walk2(names(issues), issues, ~ cat(sprintf("  %s: %d\n", .x, .y)))
  }
  
  invisible(issues)
}


# ============================
# 3. PRIMARY ANALYSIS: ADDA
# ============================

calculate_adda <- function(data) {
  # ADDA = Appropriate Deference to Decision Aid
  # Calculated only for cases where initial != AI suggestion
  
  adda_data <- data$metrics %>%
    filter(addaDenominator == TRUE) %>%
    summarize(
      n_eligible = n(),
      n_adda_true = sum(adda == TRUE, na.rm = TRUE),
      n_adda_false = sum(adda == FALSE, na.rm = TRUE),
      adda_rate = mean(adda == TRUE, na.rm = TRUE),
      adda_ci_low = binom.test(n_adda_true, n_eligible)$conf.int[1],
      adda_ci_high = binom.test(n_adda_true, n_eligible)$conf.int[2]
    )
  
  cat("ADDA Analysis:\n")
  cat(sprintf("  Eligible cases (initial != AI): %d\n", adda_data$n_eligible))
  cat(sprintf("  ADDA = TRUE: %d (%.1f%%)\n", 
              adda_data$n_adda_true, 
              adda_data$adda_rate * 100))
  cat(sprintf("  95%% CI: [%.1f%%, %.1f%%]\n",
              adda_data$adda_ci_low * 100,
              adda_data$adda_ci_high * 100))
  
  adda_data
}

# ADDA by condition
adda_by_condition <- function(data) {
  data$metrics %>%
    filter(addaDenominator == TRUE) %>%
    group_by(condition) %>%
    summarize(
      n = n(),
      adda_rate = mean(adda == TRUE, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      adda_pct = sprintf("%.1f%%", adda_rate * 100)
    )
}


# ============================
# 4. SECONDARY ANALYSES
# ============================

# Diagnostic accuracy
calculate_accuracy <- function(data, ground_truth_col = "groundTruthBirads") {
  # Note: Requires ground truth to be in dataset
  if (!ground_truth_col %in% names(data$metrics)) {
    warning("Ground truth column not found. Skipping accuracy analysis.")
    return(NULL)
  }
  
  data$metrics %>%
    mutate(
      # Binarize: BI-RADS 4+ = positive recall
      initial_positive = initialBirads >= 4,
      final_positive = finalBirads >= 4,
      ai_positive = aiBirads >= 4,
      truth_positive = !!sym(ground_truth_col) >= 4
    ) %>%
    summarize(
      sensitivity_initial = sum(initial_positive & truth_positive) / sum(truth_positive),
      sensitivity_final = sum(final_positive & truth_positive) / sum(truth_positive),
      specificity_initial = sum(!initial_positive & !truth_positive) / sum(!truth_positive),
      specificity_final = sum(!final_positive & !truth_positive) / sum(!truth_positive)
    )
}

# Confidence calibration
analyze_confidence <- function(data) {
  # Requires confidence columns
  conf_cols <- c("confidencePreAI", "confidencePostAI")
  if (!all(conf_cols %in% names(data$metrics))) {
    warning("Confidence columns not found")
    return(NULL)
  }
  
  data$metrics %>%
    mutate(
      confidence_shift = confidencePostAI - confidencePreAI
    ) %>%
    summarize(
      mean_pre = mean(confidencePreAI, na.rm = TRUE),
      mean_post = mean(confidencePostAI, na.rm = TRUE),
      mean_shift = mean(confidence_shift, na.rm = TRUE),
      shift_toward_ai = mean(confidence_shift > 0 & finalBirads == aiBirads, na.rm = TRUE)
    )
}

# Timing analysis
analyze_timing <- function(data) {
  data$metrics %>%
    summarize(
      mean_pre_ai_time = mean(preAiTimeMs / 1000, na.rm = TRUE),
      sd_pre_ai_time = sd(preAiTimeMs / 1000, na.rm = TRUE),
      mean_post_ai_time = mean(postAiTimeMs / 1000, na.rm = TRUE),
      sd_post_ai_time = sd(postAiTimeMs / 1000, na.rm = TRUE),
      mean_total_time = mean(totalTimeMs / 1000, na.rm = TRUE)
    )
}


# ============================
# 5. STATISTICAL TESTS
# ============================

# Compare ADDA across conditions
compare_conditions <- function(data) {
  # Chi-square test for ADDA by condition
  contingency <- data$metrics %>%
    filter(addaDenominator == TRUE) %>%
    count(condition, adda) %>%
    pivot_wider(names_from = adda, values_from = n, values_fill = 0)
  
  if (ncol(contingency) > 2) {
    test_result <- chisq.test(contingency[, -1])
    cat("Chi-square test for ADDA by condition:\n")
    print(test_result)
  }
  
  invisible(contingency)
}

# Mixed-effects model for repeated measures
fit_mixed_model <- function(data) {
  # Requires lme4
  # Model: ADDA ~ condition + (1|readerId) + (1|caseId)
  
  model_data <- data$metrics %>%
    filter(addaDenominator == TRUE) %>%
    mutate(adda_numeric = as.numeric(adda == TRUE))
  
  if (n_distinct(model_data$sessionId) < 3) {
    warning("Not enough readers for mixed model")
    return(NULL)
  }
  
  model <- glmer(
    adda_numeric ~ condition + (1|sessionId) + (1|caseId),
    data = model_data,
    family = binomial
  )
  
  summary(model)
}


# ============================
# 6. VISUALIZATION
# ============================

# ADDA by condition bar plot
plot_adda_by_condition <- function(data) {
  adda_summary <- adda_by_condition(data)
  
  ggplot(adda_summary, aes(x = condition, y = adda_rate, fill = condition)) +
    geom_col() +
    geom_text(aes(label = adda_pct), vjust = -0.5) +
    scale_y_continuous(labels = scales::percent, limits = c(0, 1)) +
    labs(
      title = "ADDA Rate by Condition",
      x = "Condition",
      y = "ADDA Rate",
      caption = "ADDA = changed toward AI when initial ≠ AI"
    ) +
    theme_minimal() +
    theme(legend.position = "none")
}

# Timing distribution
plot_timing <- function(data) {
  data$metrics %>%
    select(sessionId, preAiTimeMs, postAiTimeMs) %>%
    pivot_longer(cols = c(preAiTimeMs, postAiTimeMs), 
                 names_to = "phase", values_to = "time_ms") %>%
    mutate(
      phase = recode(phase, 
                     preAiTimeMs = "Pre-AI", 
                     postAiTimeMs = "Post-AI"),
      time_sec = time_ms / 1000
    ) %>%
    ggplot(aes(x = time_sec, fill = phase)) +
    geom_density(alpha = 0.5) +
    labs(
      title = "Time Distribution by Phase",
      x = "Time (seconds)",
      y = "Density",
      fill = "Phase"
    ) +
    theme_minimal()
}

# Assessment change sankey/flow
plot_assessment_flow <- function(data) {
  flow_data <- data$metrics %>%
    count(initialBirads, finalBirads, aiBirads) %>%
    mutate(
      changed = initialBirads != finalBirads,
      toward_ai = changed & (finalBirads == aiBirads)
    )
  
  ggplot(flow_data, aes(x = factor(initialBirads), y = n, fill = factor(finalBirads))) +
    geom_col(position = "stack") +
    labs(
      title = "Assessment Changes",
      x = "Initial BI-RADS",
      y = "Count",
      fill = "Final BI-RADS"
    ) +
    theme_minimal()
}


# ============================
# 7. EXPORT RESULTS
# ============================

export_results <- function(data, output_dir = "./results") {
  dir.create(output_dir, showWarnings = FALSE)
  
  # Summary statistics
  summary_stats <- list(
    adda = calculate_adda(data),
    adda_by_condition = adda_by_condition(data),
    timing = analyze_timing(data)
  )
  
  write_rds(summary_stats, file.path(output_dir, "summary_stats.rds"))
  
  # Plots
  ggsave(file.path(output_dir, "adda_by_condition.png"),
         plot_adda_by_condition(data), width = 8, height = 6)
  
  ggsave(file.path(output_dir, "timing_distribution.png"),
         plot_timing(data), width = 8, height = 6)
  
  cat("Results exported to:", output_dir, "\n")
}


# ============================
# 8. MAIN EXECUTION
# ============================

main <- function(export_dir = "./exports") {
  cat("Loading data...\n")
  data <- load_all_exports(export_dir)
  
  cat("\nVerifying data integrity...\n")
  verify_data_integrity(data)
  
  cat("\n--- PRIMARY ANALYSIS ---\n")
  adda <- calculate_adda(data)
  
  cat("\n--- ADDA BY CONDITION ---\n")
  print(adda_by_condition(data))
  
  cat("\n--- TIMING ANALYSIS ---\n")
  print(analyze_timing(data))
  
  cat("\n--- STATISTICAL TESTS ---\n")
  compare_conditions(data)
  
  cat("\nAnalysis complete.\n")
  
  invisible(data)
}

# Run analysis
# data <- main("./exports")
