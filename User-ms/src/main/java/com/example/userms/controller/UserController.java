package com.example.userms.controller;
import com.example.userms.dto.request.*;
import com.example.userms.dto.UserRegistrationDto;
import com.example.userms.dto.response.TelegramConnectInitResponse;
import com.example.userms.dto.response.TelegramStatusResponse;
import com.example.userms.model.UserEntity;
import com.example.userms.service.SystemStateService;
import com.example.userms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

        private final UserService userService;
        private final SystemStateService systemStateService;

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
    public ResponseEntity<Map<String, String>> login(@RequestBody @Valid LoginRequest loginRequest) {
        String token = userService.login(loginRequest.getEmail(), loginRequest.getPassword());

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        return ResponseEntity.ok(response);
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
    public ResponseEntity<Void> deleteMyAccount(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        userService.deleteUser(currentUser.getUsername());
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/me")
    public ResponseEntity<UserEntity> getMyProfile() {
        return ResponseEntity.ok(userService.getMyProfile());
    }

    @PutMapping("/telegram/connect")
    public ResponseEntity<TelegramStatusResponse> connectTelegram(
            @AuthenticationPrincipal UserDetails currentUser,
            @RequestBody @Valid TelegramConnectRequest request
    ) {
        return ResponseEntity.ok(userService.connectTelegram(currentUser.getUsername(), request.getChatId()));
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

    @GetMapping("/telegram/chats")
    public ResponseEntity<List<String>> getAllTelegramChats() {
        return ResponseEntity.ok(userService.getAllTelegramChatIds());
    }


    @PostMapping("/telegram/disconnect")
    public ResponseEntity<?> disconnectTelegram(@AuthenticationPrincipal UserDetails currentUser) {
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
    public ResponseEntity<Map<String, String>> googleLogin(@RequestBody @Valid GoogleLoginRequest request) {
        String token = userService.googleLogin(request);

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        return ResponseEntity.ok(response);
    }
    }
