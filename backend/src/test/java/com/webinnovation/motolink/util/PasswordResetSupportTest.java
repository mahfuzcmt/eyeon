package com.webinnovation.motolink.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordResetSupportTest {

    @Test
    void codeIsSixDigits() {
        for (int i = 0; i < 200; i++) {
            assertTrue(PasswordResetSupport.generateCode().matches("\\d{6}"));
        }
    }

    @Test
    void maskPhoneKeepsPrefixAndLastThree() {
        assertEquals("+88017••••678", PasswordResetSupport.maskPhone("+8801712345678"));
        assertEquals("••••", PasswordResetSupport.maskPhone("123"));
        assertEquals("••••", PasswordResetSupport.maskPhone(null));
    }

    @Test
    void normalizesBangladeshNumbersForSslWireless() {
        assertEquals("8801712345678", PasswordResetSupport.normalizeBdMsisdn("+880 1712-345678"));
        assertEquals("8801712345678", PasswordResetSupport.normalizeBdMsisdn("01712345678"));
        assertEquals("8801712345678", PasswordResetSupport.normalizeBdMsisdn("1712345678"));
        assertEquals("8801712345678", PasswordResetSupport.normalizeBdMsisdn("8801712345678"));
        assertNull(PasswordResetSupport.normalizeBdMsisdn(""));
    }
}
