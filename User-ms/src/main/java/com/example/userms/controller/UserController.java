package com.example.userms.controller;

import com.example.userms.dto.UserRegistrationDto;
import com.example.userms.dto.request.GoogleLoginRequest;
import com.example.userms.dto.request.LoginRequest;
import com.example.userms.dto.request.UserUpdateRequest;
import com.example.userms.dto.request.VerifyRequest;
import com.example.userms.dto.response.AuthResponse;
import com.example.userms.dto.response.TelegramConnectInitResponse;
import com.example.userms.dto.response.TelegramStatusResponse;
import com.example.userms.dto.response.UserProfileResponse;
import com.example.userms.service.RefreshTokenCookieService;
import com.example.userms.service.SystemStateService;
import com.example.userms.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SystemStateService systemStateService;
    private final RefreshTokenCookieService refreshTokenCookieService;

    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@RequestBody @Valid UserRegistrationDto dto) {
        userService.createUser(dto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verify(@RequestBody @Valid VerifyRequest request) {
        userService.verifyEmail(request.getEmail(), request.getCode());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Hesab təsdiqləndi!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody @Valid LoginRequest loginRequest,
            HttpServletResponse response
    ) {
        var authResponse = userService.login(loginRequest.getEmail(), loginRequest.getPassword());

        if (authResponse == null || authResponse.getRefreshToken() == null) {
            return ResponseEntity.status(401).build();
        }
        refreshTokenCookieService.addRefreshTokenCookie(response, authResponse.getRefreshToken());

        return ResponseEntity.ok(
                AuthResponse.builder()
                        .accessToken(authResponse.getAccessToken())
                        .build()
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = refreshTokenCookieService.extractRefreshToken(request);

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        var authResponse = userService.refreshToken(refreshToken);
        refreshTokenCookieService.addRefreshTokenCookie(response, authResponse.getRefreshToken());
        return ResponseEntity.ok(
                AuthResponse.builder()
                        .accessToken(authResponse.getAccessToken())
                        .build()
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletResponse response
    ) {
        if (currentUser != null) {
            userService.logout(currentUser.getUsername());
        }

        refreshTokenCookieService.clearRefreshTokenCookie(response);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/update")
    public ResponseEntity<Void> update(
            @AuthenticationPrincipal UserDetails currentUser,
            @RequestBody @Valid UserUpdateRequest request
    ) {
        userService.updateUser(currentUser.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteMyAccount(@AuthenticationPrincipal UserDetails currentUser) {
        userService.deleteUser(currentUser.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile() {
        return ResponseEntity.ok(userService.getMyProfile());
    }

    @GetMapping("/telegram/me")
    public ResponseEntity<TelegramStatusResponse> getMyTelegramStatus(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        return ResponseEntity.ok(userService.getTelegramStatus(currentUser.getUsername()));
    }

    @PostMapping("/telegram/connect/init")
    public ResponseEntity<TelegramConnectInitResponse> initTelegramConnect(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        return ResponseEntity.ok(userService.initTelegramConnection(currentUser.getUsername()));
    }

    @PostMapping("/telegram/connect/confirm")
    public ResponseEntity<TelegramStatusResponse> confirmTelegramConnect(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        return ResponseEntity.ok(userService.confirmTelegramConnection(currentUser.getUsername()));
    }

    @PostMapping("/telegram/disconnect")
    public ResponseEntity<Void> disconnectTelegram(@AuthenticationPrincipal UserDetails currentUser) {
        userService.disconnectTelegram(currentUser.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/system-info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("tournamentActive", systemStateService.isTournamentActive());
        info.put("globalMessage", systemStateService.getGlobalMessage());
        return ResponseEntity.ok(info);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @RequestBody @Valid GoogleLoginRequest request,
            HttpServletResponse response
    ) {
        var authResponse = userService.googleLogin(request);

        if (authResponse == null || authResponse.getRefreshToken() == null) {
            return ResponseEntity.status(401).build();
        }
        refreshTokenCookieService.addRefreshTokenCookie(response, authResponse.getRefreshToken());

        return ResponseEntity.ok(
                AuthResponse.builder()
                        .accessToken(authResponse.getAccessToken())
                        .build()
        );
    }
}