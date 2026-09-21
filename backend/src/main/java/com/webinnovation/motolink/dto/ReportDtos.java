package com.webinnovation.motolink.dto;

import java.time.LocalDate;
import java.util.List;

public final class ReportDtos {

    private ReportDtos() {}

    /**
     * One Dhaka-local calendar day of the monthly driving & stoppage report.
     * drivingS = trip duration minus idle; stoppedS = rest of the (elapsed) day.
     */
    public record MonthlyDay(
            LocalDate date,
            int trips,
            long distanceM,
            long drivingS,
            long idleS,
            long stoppedS,
            int maxSpeed
    ) {}

    public record MonthlyTotals(
            int trips,
            long distanceM,
            long drivingS,
            long idleS,
            long stoppedS,
            int maxSpeed
    ) {}

    /** month is ISO yyyy-MM. Days run from the 1st through today (or month end). */
    public record MonthlySummary(
            String deviceImei,
            String month,
            List<MonthlyDay> days,
            MonthlyTotals totals
    ) {}
}
