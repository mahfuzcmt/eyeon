package com.webinnovation.eyeon.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.LoggingEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The prod profile logs one JSON object per line. A bad pattern only shows up at startup in
 * production, and a missing %ex means errors arrive with no stack trace at all (which is how
 * this test came to exist), so the real pattern from logback-spring.xml is exercised here.
 */
class ProdLogPatternTest {

    private static String prodPattern() throws Exception {
        String xml = Files.readString(Path.of("src/main/resources/logback-spring.xml"));
        Matcher m = Pattern.compile("<pattern>(\\{\"ts\".*?)</pattern>", Pattern.DOTALL).matcher(xml);
        assertTrue(m.find(), "prod JSON pattern not found in logback-spring.xml");
        return m.group(1).replace("${appName}", "eyeon").replace("${profile}", "prod");
    }

    private static String render(String message, Throwable t) throws Exception {
        LoggerContext ctx = new LoggerContext();
        PatternLayout layout = new PatternLayout();
        layout.setContext(ctx);
        layout.setPattern(prodPattern());
        layout.start();
        Logger logger = ctx.getLogger("com.webinnovation.eyeon.Test");
        return layout.doLayout(new LoggingEvent(Logger.class.getName(), logger, Level.ERROR, message, t, null));
    }

    @Test
    void an_error_is_one_line_of_valid_json_with_the_root_cause() throws Exception {
        Exception cause = new IllegalStateException("duplicate key \"idx_x\"\n  Detail: Key (imei)=(1) exists");
        String out = render("Unhandled \"quoted\" exception in C:\\temp\\x", new RuntimeException("wrapper", cause));

        assertEquals(1, out.strip().lines().count(), "must stay on one line: " + out);
        JsonNode json = new ObjectMapper().readTree(out);
        assertEquals("ERROR", json.get("level").asText());
        assertTrue(json.get("msg").asText().contains("quoted"));
        String ex = json.get("ex").asText();
        assertTrue(ex.contains("IllegalStateException"), ex);
        assertTrue(ex.contains("ProdLogPatternTest"), "stack frames missing: " + ex);
    }

    @Test
    void a_plain_message_has_an_empty_ex_field() throws Exception {
        JsonNode json = new ObjectMapper().readTree(render("Backend healthy", null));
        assertEquals("Backend healthy", json.get("msg").asText());
        assertEquals("", json.get("ex").asText());
    }
}
