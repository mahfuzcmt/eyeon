package com.webinnovation.motolink.exception;

public class ForbiddenException extends DomainException {
    public ForbiddenException(String message) {
        super("FORBIDDEN", message);
    }
}
