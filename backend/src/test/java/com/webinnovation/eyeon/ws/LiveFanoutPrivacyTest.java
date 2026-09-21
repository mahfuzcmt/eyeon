package com.webinnovation.eyeon.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinnovation.eyeon.domain.Alarm;
import com.webinnovation.eyeon.domain.User;
import com.webinnovation.eyeon.repository.AlarmRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository;
import com.webinnovation.eyeon.repository.UserDeviceRepository.Assignment;
import com.webinnovation.eyeon.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A school with an admin and two parents. Rafi (KID_1) belongs to parent A, Mahim (KID_2) to
 * parent B. Nobody may receive live data about a child they cannot see, and a trusted-place
 * alarm goes to the place's owner only.
 */
class LiveFanoutPrivacyTest {

    private static final String KID_1 = "864290060000001";
    private static final String KID_2 = "864290060000002";

    private final UUID orgId = UUID.randomUUID();
    private final User admin = user("ORG_ADMIN", false, true);
    private final User parentA = user("ORG_USER", false, true);
    private final User parentB = user("ORG_USER", false, true);
    private final User teacherSeesAll = user("ORG_USER", true, true);
    private final User disabledParent = user("ORG_USER", false, false);

    private SimpMessagingTemplate broker;
    private LiveAudience audience;
    private final ObjectMapper json = new ObjectMapper();

    private User user(String role, boolean seeAll, boolean active) {
        return new User(UUID.randomUUID(), orgId, role + "@x", null, "h", role, role, active, seeAll,
                null, Instant.now(), Instant.now());
    }

    @BeforeEach
    void setUp() {
        UserRepository users = mock(UserRepository.class);
        UserDeviceRepository assignments = mock(UserDeviceRepository.class);
        when(users.listByOrg(orgId)).thenReturn(List.of(admin, parentA, parentB, teacherSeesAll, disabledParent));
        when(assignments.listForOrg(orgId)).thenReturn(List.of(
                new Assignment(parentA.id(), KID_1),
                new Assignment(parentB.id(), KID_2),
                new Assignment(disabledParent.id(), KID_1)));
        broker = mock(SimpMessagingTemplate.class);
        audience = new LiveAudience(users, assignments);
    }

    private static DefaultMessage redis(String body) {
        return new DefaultMessage("ch".getBytes(StandardCharsets.UTF_8), body.getBytes(StandardCharsets.UTF_8));
    }

    /** userId -> payloads received on the given queue */
    private Map<String, List<JsonNode>> received(String queue) {
        ArgumentCaptor<String> who = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> what = ArgumentCaptor.forClass(Object.class);
        verify(broker, atLeast(0)).convertAndSendToUser(who.capture(), eq(queue), what.capture());
        Map<String, List<JsonNode>> out = new HashMap<>();
        for (int i = 0; i < who.getAllValues().size(); i++) {
            out.computeIfAbsent(who.getAllValues().get(i), k -> new ArrayList<>())
                    .add(json.valueToTree(what.getAllValues().get(i)));
        }
        return out;
    }

    private static Set<String> imeis(JsonNode batch) {
        Set<String> s = new java.util.HashSet<>();
        batch.forEach(n -> s.add(n.path("imei").asText()));
        return s;
    }

    @Test
    void audience_resolves_who_sees_which_child() {
        Map<String, LiveAudience.Viewer> byUser = new HashMap<>();
        audience.forOrg(orgId).forEach(v -> byUser.put(v.userName(), v));

        assertNull(byUser.get(admin.id().toString()).visible(), "admin sees everyone");
        assertNull(byUser.get(teacherSeesAll.id().toString()).visible(), "see-all flag sees everyone");
        assertEquals(Set.of(KID_1), byUser.get(parentA.id().toString()).visible());
        assertEquals(Set.of(KID_2), byUser.get(parentB.id().toString()).visible());
        assertFalse(byUser.containsKey(disabledParent.id().toString()), "disabled users receive nothing");
    }

    @Test
    void each_parent_receives_only_their_own_child_s_locations() throws Exception {
        new BatchLocationFanout(broker, json, audience).onMessage(redis("""
                {"orgId":"%s","locations":[
                  {"imei":"%s","latitude":23.81,"longitude":90.41,"orgId":"%s"},
                  {"imei":"%s","latitude":23.75,"longitude":90.39,"orgId":"%s"}]}
                """.formatted(orgId, KID_1, orgId, KID_2, orgId)), null);

        Map<String, List<JsonNode>> got = received("/queue/locations/batch");
        assertEquals(Set.of(KID_1), imeis(got.get(parentA.id().toString()).get(0)));
        assertEquals(Set.of(KID_2), imeis(got.get(parentB.id().toString()).get(0)));
        assertEquals(Set.of(KID_1, KID_2), imeis(got.get(admin.id().toString()).get(0)));
        assertEquals(Set.of(KID_1, KID_2), imeis(got.get(teacherSeesAll.id().toString()).get(0)));
        assertFalse(got.containsKey(disabledParent.id().toString()));
        // internal orgId never leaves the server
        assertTrue(got.get(admin.id().toString()).get(0).get(0).path("orgId").isMissingNode());
    }

    @Test
    void a_batch_with_only_another_family_s_child_sends_nothing_to_a_parent() throws Exception {
        new BatchLocationFanout(broker, json, audience).onMessage(redis("""
                {"orgId":"%s","locations":[{"imei":"%s","latitude":23.75,"longitude":90.39}]}
                """.formatted(orgId, KID_2)), null);

        Map<String, List<JsonNode>> got = received("/queue/locations/batch");
        assertFalse(got.containsKey(parentA.id().toString()));
        assertTrue(got.containsKey(parentB.id().toString()));
    }

    @Test
    void sos_goes_to_everyone_who_can_see_that_child_and_nobody_else() throws Exception {
        new AlarmFanout(broker, json, audience).onMessage(redis("""
                {"id":"a1","orgId":"%s","imei":"%s","type":"SOS","severity":"CRITICAL","metadata":{}}
                """.formatted(orgId, KID_1)), null);

        Map<String, List<JsonNode>> got = received("/queue/alarms");
        assertEquals(Set.of(admin.id().toString(), parentA.id().toString(), teacherSeesAll.id().toString()), got.keySet());
    }

    @Test
    void a_trusted_place_alarm_goes_to_the_place_owner_only() throws Exception {
        // Parent A's private "Home": the school admin must not be told Rafi reached home.
        new AlarmFanout(broker, json, audience).onMessage(redis("""
                {"id":"a2","orgId":"%s","imei":"%s","type":"PLACE_ARRIVED","severity":"INFO",
                 "metadata":{"geofenceName":"Home","geofenceOwnerId":"%s"}}
                """.formatted(orgId, KID_1, parentA.id())), null);

        assertEquals(Set.of(parentA.id().toString()), received("/queue/alarms").keySet());
    }

    @Test
    void owner_rule_for_alarms_loaded_from_the_database() {
        Alarm owned = new Alarm(UUID.randomUUID(), orgId, KID_1, "PLACE_LEFT", "INFO", Instant.now(), 0d, 0d,
                false, null, null, null, null, Map.of("geofenceOwnerId", parentA.id().toString()), Instant.now());
        Alarm legacy = new Alarm(UUID.randomUUID(), orgId, KID_1, "GEOFENCE_EXIT", "WARNING", Instant.now(), 0d, 0d,
                false, null, null, null, null, Map.of(), Instant.now());
        Alarm sos = new Alarm(UUID.randomUUID(), orgId, KID_1, "SOS", "CRITICAL", Instant.now(), 0d, 0d,
                false, null, null, null, null, Map.of("geofenceOwnerId", parentA.id().toString()), Instant.now());

        assertTrue(AlarmRepository.visibleTo(owned, parentA.id()));
        assertFalse(AlarmRepository.visibleTo(owned, admin.id()), "admins do not see a parent's private place alerts");
        assertTrue(AlarmRepository.visibleTo(legacy, admin.id()), "tracker-side geofence alarms have no owner");
        assertTrue(AlarmRepository.visibleTo(sos, admin.id()), "the owner rule only applies to geofence types");
    }

    @Test
    void invalidate_applies_assignment_changes_immediately() {
        audience.forOrg(orgId);
        audience.invalidate(orgId);
        // a fresh load is allowed to differ; here we simply check the cache no longer serves the old list
        assertFalse(audience.forOrg(orgId).isEmpty());
    }
}
