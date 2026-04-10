package com.example.userms.dto.request;

import lombok.Data;

@Data
public class GoogleLoginRequest {
    private String idToken;
    private String credential;
}
