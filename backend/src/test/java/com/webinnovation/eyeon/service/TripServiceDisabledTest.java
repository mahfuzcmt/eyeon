package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.protocol.LocationData;
import com.webinnovation.eyeon.repository.LocationRepository;
import com.webinnovation.eyeon.repository.TripRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/** EyeOn tracks people: with the default configuration no trip is ever opened or closed. */
class TripServiceDisabledTest {

    @Test
    void trip_detection_is_off_unless_explicitly_enabled() {
        TripRepository tripRepo = mock(TripRepository.class);
        LocationRepository locationRepo = mock(LocationRepository.class);
        TripService service = new TripService(tripRepo, locationRepo);

        LocationData loc = new LocationData();
        loc.setOrgId(UUID.randomUUID());
        loc.setImei("864290061234567");
        loc.setTimestamp(Instant.now());
        loc.setLatitude(23.8103);
        loc.setLongitude(90.4125);
        loc.setSpeed(40);
        loc.setValid(true);
        loc.setAccOn(true);

        service.onLocation(loc);
        assertEquals(0, service.closeStaleTrips());

        verifyNoInteractions(tripRepo, locationRepo);
    }
}
