package com.spring.security.pricems.exception;

import org.springframework.http.HttpStatus;

public class CryptoException extends RuntimeException {

    private final HttpStatus status;

    public CryptoException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    public CryptoException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}