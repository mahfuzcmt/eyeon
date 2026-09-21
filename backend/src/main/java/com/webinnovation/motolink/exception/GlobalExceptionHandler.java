package com.webinnovation.motolink.exception;

import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    public record ErrorBody(String code, String message, Object details) {}
    public record ErrorEnvelope(ErrorBody error) {}

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorEnvelope> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorEnvelope(new ErrorBody(e.getCode(), e.getMessage(), null)));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorEnvelope> handleForbidden(ForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorEnvelope(new ErrorBody(e.getCode(), e.getMessage(), null)));
    }

    @ExceptionHandler(SubscriptionExpiredException.class)
    public ResponseEntity<ErrorEnvelope> handleSubscriptionExpired(SubscriptionExpiredException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorEnvelope(new ErrorBody(e.getCode(), e.getMessage(), null)));
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorEnvelope> handleDomain(DomainException e) {
        HttpStatus status = switch (e.getCode()) {
            case "INVALID_CREDENTIALS", "INVALID_REFRESH", "REFRESH_REVOKED", "REFRESH_EXPIRED" ->
                    HttpStatus.UNAUTHORIZED;
            case "ACCOUNT_INACTIVE" -> HttpStatus.FORBIDDEN;
            case "NO_ORG", "ORG_NOT_FOUND", "USER_NOT_FOUND" -> HttpStatus.UNPROCESSABLE_ENTITY;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status)
                .body(new ErrorEnvelope(new ErrorBody(e.getCode(), e.getMessage(), null)));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorEnvelope> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fields = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        f -> f.getField(),
                        f -> f.getDefaultMessage() == null ? "invalid" : f.getDefaultMessage(),
                        (a, b) -> a));
        return ResponseEntity.badRequest()
                .body(new ErrorEnvelope(new ErrorBody("VALIDATION_FAILED", "Request validation failed", fields)));
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorEnvelope> handleJwt(JwtException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorEnvelope(new ErrorBody("INVALID_TOKEN", e.getMessage(), null)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorEnvelope> handleGeneric(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorEnvelope(new ErrorBody("INTERNAL_ERROR", "An unexpected error occurred", null)));
    }
}
