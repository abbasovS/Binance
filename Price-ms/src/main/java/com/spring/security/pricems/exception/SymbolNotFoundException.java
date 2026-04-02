package com.spring.security.pricems.exception;

public class SymbolNotFoundException extends CryptoException {
    public SymbolNotFoundException(String message) {
        super(message);
    }
}
