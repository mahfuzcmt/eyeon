package com.webinnovation.eyeon.service;

import com.webinnovation.eyeon.protocol.NetworkScan;
import com.webinnovation.eyeon.service.CellLocationService.CellLocation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Request and response shape of the Google Geolocation call for a Wi-Fi / cell scan. */
class CellLocationServiceScanTest {

    private CellLocationService service;
    private MockRestServiceServer google;

    private static final NetworkScan SCAN = new NetworkScan(Instant.parse("2026-10-01T06:46:38Z"), 470, 2,
            List.of(new NetworkScan.Cell(48111, 33526800L, 55)),
            List.of(new NetworkScan.Wifi("10:5a:95:ea:d1:d1", -53), new NetworkScan.Wifi("0c:80:63:0a:52:be", -61)));

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        google = MockRestServiceServer.bindTo(builder).build();
        service = new CellLocationService(builder);
        ReflectionTestUtils.setField(service, "googleGeolocationApiKey", "test-key");
    }

    @Test
    void sends_cells_and_access_points_and_reads_the_estimate() {
        google.expect(requestTo("https://www.googleapis.com/geolocation/v1/geolocate?key=test-key"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.considerIp").value(false))
                .andExpect(jsonPath("$.radioType").value("lte"))
                .andExpect(jsonPath("$.cellTowers[0].cellId").value(33526800))
                .andExpect(jsonPath("$.cellTowers[0].locationAreaCode").value(48111))
                .andExpect(jsonPath("$.cellTowers[0].mobileCountryCode").value(470))
                .andExpect(jsonPath("$.cellTowers[0].mobileNetworkCode").value(2))
                .andExpect(jsonPath("$.wifiAccessPoints[0].macAddress").value("10:5a:95:ea:d1:d1"))
                .andExpect(jsonPath("$.wifiAccessPoints[0].signalStrength").value(-53))
                .andExpect(jsonPath("$.wifiAccessPoints.length()").value(2))
                .andRespond(withSuccess("{\"location\":{\"lat\":23.7806,\"lng\":90.4074},\"accuracy\":34.6}",
                        MediaType.APPLICATION_JSON));

        Optional<CellLocation> where = service.locate(SCAN);

        google.verify();
        assertTrue(where.isPresent());
        assertEquals(23.7806, where.get().getLatitude());
        assertEquals(90.4074, where.get().getLongitude());
        assertEquals(35, where.get().getAccuracyMeters());
    }

    @Test
    void an_unknown_scan_is_simply_not_located() {
        google.expect(requestTo("https://www.googleapis.com/geolocation/v1/geolocate?key=test-key"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":404,\"message\":\"Not Found\"}}"));

        assertFalse(service.locate(SCAN).isPresent());
    }

    @Test
    void nothing_is_requested_when_no_service_is_configured() {
        ReflectionTestUtils.setField(service, "googleGeolocationApiKey", "");

        assertFalse(service.canLocateScans());
        assertFalse(service.locate(SCAN).isPresent());
        google.verify();  // no request was expected, none was made
    }
}
