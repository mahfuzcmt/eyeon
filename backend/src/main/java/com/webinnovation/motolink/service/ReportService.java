package com.webinnovation.motolink.service;

import com.webinnovation.motolink.domain.Alarm;
import com.webinnovation.motolink.domain.Trip;
import com.webinnovation.motolink.dto.ReportDtos.MonthlyDay;
import com.webinnovation.motolink.dto.ReportDtos.MonthlySummary;
import com.webinnovation.motolink.dto.ReportDtos.MonthlyTotals;
import com.webinnovation.motolink.exception.NotFoundException;
import com.webinnovation.motolink.repository.AlarmRepository;
import com.webinnovation.motolink.repository.DeviceRepository;
import com.webinnovation.motolink.repository.TripRepository;
import com.webinnovation.motolink.repository.TripRepository.DailyAgg;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Aggregates Phase 3 reportable events and renders them as CSV. PDF and Excel
 * formats are intentionally deferred to Phase 4 per CLAUDE.md §16 — CSV alone
 * satisfies the Phase 3 exit criteria of "Trip with start/end appears on report."
 *
 * <p>All timestamps render in Asia/Dhaka local time so Bangladesh operators can
 * read them at a glance; the CSV header notes the zone explicitly.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final ZoneId DHAKA = ZoneId.of("Asia/Dhaka");
    private static final DateTimeFormatter ISO_LOCAL =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final TripRepository tripRepo;
    private final AlarmRepository alarmRepo;
    private final DeviceRepository deviceRepo;

    public String tripsCsv(UUID orgId, LocalDate from, LocalDate to) {
        Instant fromTs = from.atStartOfDay(DHAKA).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(DHAKA).toInstant();
        List<Trip> trips = tripRepo.listForOrg(orgId, fromTs, toTs, 10_000, 0);

        StringBuilder sb = new StringBuilder();
        sb.append("# trips report ").append(from).append(" to ").append(to).append(" (Asia/Dhaka)\n");
        sb.append("trip_id,device_imei,started_at,ended_at,distance_km,duration_min,max_speed_kmh,avg_speed_kmh,status\n");
        for (Trip t : trips) {
            sb.append(t.id()).append(',')
              .append(escape(t.deviceImei())).append(',')
              .append(localTs(t.startedAt())).append(',')
              .append(localTs(t.endedAt())).append(',')
              .append(String.format("%.2f", t.distanceM() / 1000.0)).append(',')
              .append(t.durationS() == null ? "" : (t.durationS() / 60)).append(',')
              .append(t.maxSpeed()).append(',')
              .append(t.avgSpeed()).append(',')
              .append(t.status())
              .append('\n');
        }
        return sb.toString();
    }

    public String alarmsCsv(UUID orgId, LocalDate from, LocalDate to) {
        Instant fromTs = from.atStartOfDay(DHAKA).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(DHAKA).toInstant();
        List<Alarm> alarms = alarmRepo.findInRange(orgId, fromTs, toTs);

        StringBuilder sb = new StringBuilder();
        sb.append("# alarms report ").append(from).append(" to ").append(to).append(" (Asia/Dhaka)\n");
        sb.append("alarm_id,device_imei,type,severity,ts,latitude,longitude,acknowledged\n");
        for (Alarm a : alarms) {
            sb.append(a.id()).append(',')
              .append(escape(a.deviceImei())).append(',')
              .append(a.type()).append(',')
              .append(a.severity()).append(',')
              .append(localTs(a.ts())).append(',')
              .append(a.latitude() == null ? "" : a.latitude()).append(',')
              .append(a.longitude() == null ? "" : a.longitude()).append(',')
              .append(a.acknowledged())
              .append('\n');
        }
        return sb.toString();
    }

    /**
     * AutoNemo-parity monthly driving & stoppage report. One row per Dhaka-local
     * day from the 1st through today (or through month end for past months).
     * Days without completed trips render as fully stopped.
     */
    public MonthlySummary monthlySummary(UUID orgId, String imei, YearMonth month) {
        deviceRepo.findByOrgAndImei(orgId, imei)
                .orElseThrow(() -> new NotFoundException("device", imei));

        ZonedDateTime monthStart = month.atDay(1).atStartOfDay(DHAKA);
        ZonedDateTime monthEnd = month.plusMonths(1).atDay(1).atStartOfDay(DHAKA);
        Instant now = Instant.now();

        Map<LocalDate, DailyAgg> byDay = tripRepo
                .dailyAggregates(orgId, imei, monthStart.toInstant(), monthEnd.toInstant(), DHAKA.getId())
                .stream()
                .collect(Collectors.toMap(DailyAgg::day, Function.identity()));

        LocalDate today = LocalDate.now(DHAKA);
        LocalDate lastDay = month.atEndOfMonth();
        if (YearMonth.from(today).equals(month) && today.isBefore(lastDay)) lastDay = today;

        List<MonthlyDay> days = new ArrayList<>();
        long totTrips = 0, totDist = 0, totDrive = 0, totIdle = 0, totStop = 0;
        int totMax = 0;
        for (LocalDate d = month.atDay(1); !d.isAfter(lastDay); d = d.plusDays(1)) {
            Instant dayStart = d.atStartOfDay(DHAKA).toInstant();
            long daySeconds = Math.min(86_400L,
                    Math.max(0, (now.toEpochMilli() - dayStart.toEpochMilli()) / 1000));
            DailyAgg agg = byDay.get(d);
            long durationS = agg == null ? 0 : agg.durationS();
            long idleS = agg == null ? 0 : agg.idleS();
            long drivingS = Math.max(0, durationS - idleS);
            long stoppedS = Math.max(0, daySeconds - durationS);
            int trips = agg == null ? 0 : agg.trips();
            long dist = agg == null ? 0 : agg.distanceM();
            int maxSpeed = agg == null ? 0 : agg.maxSpeed();
            days.add(new MonthlyDay(d, trips, dist, drivingS, idleS, stoppedS, maxSpeed));
            totTrips += trips;
            totDist += dist;
            totDrive += drivingS;
            totIdle += idleS;
            totStop += stoppedS;
            totMax = Math.max(totMax, maxSpeed);
        }
        MonthlyTotals totals = new MonthlyTotals((int) totTrips, totDist, totDrive, totIdle, totStop, totMax);
        return new MonthlySummary(imei, month.toString(), days, totals);
    }

    public String monthlySummaryCsv(UUID orgId, String imei, YearMonth month) {
        MonthlySummary s = monthlySummary(orgId, imei, month);
        StringBuilder sb = new StringBuilder();
        sb.append("# monthly driving & stoppage report ").append(s.month())
          .append(" device ").append(s.deviceImei()).append(" (Asia/Dhaka)\n");
        sb.append("date,trips,distance_km,driving_min,idle_min,stopped_min,max_speed_kmh\n");
        for (MonthlyDay d : s.days()) {
            sb.append(d.date()).append(',')
              .append(d.trips()).append(',')
              .append(String.format("%.2f", d.distanceM() / 1000.0)).append(',')
              .append(d.drivingS() / 60).append(',')
              .append(d.idleS() / 60).append(',')
              .append(d.stoppedS() / 60).append(',')
              .append(d.maxSpeed())
              .append('\n');
        }
        MonthlyTotals t = s.totals();
        sb.append("TOTAL,").append(t.trips()).append(',')
          .append(String.format("%.2f", t.distanceM() / 1000.0)).append(',')
          .append(t.drivingS() / 60).append(',')
          .append(t.idleS() / 60).append(',')
          .append(t.stoppedS() / 60).append(',')
          .append(t.maxSpeed()).append('\n');
        return sb.toString();
    }

    private static String localTs(Instant ts) {
        if (ts == null) return "";
        return ISO_LOCAL.format(ts.atZone(DHAKA).toLocalDateTime());
    }

    private static String escape(String s) {
        if (s == null) return "";
        if (s.indexOf(',') < 0 && s.indexOf('"') < 0 && s.indexOf('\n') < 0) return s;
        return '"' + s.replace("\"", "\"\"") + '"';
    }

    /** Convenience wrapper for "today (Asia/Dhaka)" lookups. */
    public LocalDate today() {
        return LocalDate.now(DHAKA);
    }

    /** Convenience: convert wall-clock UTC midnight to LocalDate in Dhaka. */
    public LocalDate toDhakaLocalDate(Instant ts) {
        return ts.atZone(DHAKA).toLocalDate();
    }

    /** Exposed so callers can compute month boundaries without re-importing the zone. */
    public ZoneOffset dhakaOffset() {
        return DHAKA.getRules().getOffset(Instant.now());
    }
}
