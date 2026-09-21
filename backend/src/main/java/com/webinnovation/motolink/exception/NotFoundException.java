package com.webinnovation.motolink.exception;

public class NotFoundException extends DomainException {
    public NotFoundException(String resource, String id) {
        super("NOT_FOUND", resource + " not found: " + id);
    }
    public NotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
