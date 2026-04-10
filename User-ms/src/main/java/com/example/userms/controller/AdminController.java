package com.example.userms.controller;

import com.example.userms.dto.request.ChangeRoleRequest;
import com.example.userms.dto.response.UserProfileResponse;
import com.example.userms.service.InboxNotificationService;
import com.example.userms.service.SystemStateService;
import com.example.userms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserService userService;
    private final SystemStateService systemStateService;
    private final InboxNotificationService inboxNotificationService;

    @GetMapping("/dashboard")
    public ResponseEntity<String> getAdminDashboard() {
        return ResponseEntity.ok("Sən ADMIN olaraq sistemə daxil oldun.");
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<String> toggleUserStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        userService.toggleUserStatus(id, adminDetails.getUsername());
        return ResponseEntity.ok("Status dəyişdirildi");
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<String> changeUserRole(
            @PathVariable UUID id,
            @RequestBody @Valid ChangeRoleRequest request,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        userService.changeUserRole(id, request.getRole(), adminDetails.getUsername());
        return ResponseEntity.ok("Rol dəyişdirildi");
    }

    @PutMapping("/users/{id}/premium")
    public ResponseEntity<String> togglePremium(@PathVariable UUID id) {
        userService.togglePremiumStatus(id);
        return ResponseEntity.ok("Premium status dəyişdirildi");
    }

    @PutMapping("/users/{id}/tournament")
    public ResponseEntity<String> toggleTournamentParticipation(@PathVariable UUID id) {
        userService.toggleTournamentParticipation(id);
        return ResponseEntity.ok("Turnir iştirakı dəyişdirildi");
    }

    @PostMapping("/tournament/control")
    public ResponseEntity<String> controlTournament(@RequestParam String action) {
        log.info("Turnir əmri alındı: {}", action);
        userService.controlTournament(action);

        if ("start".equalsIgnoreCase(action)) {
            systemStateService.setTournamentActive(true);
        } else if ("stop".equalsIgnoreCase(action)) {
            systemStateService.setTournamentActive(false);
        }

        return ResponseEntity.ok("Turnir əmri uğurla icra edildi: " + action);
    }

    @PostMapping("/broadcast")
    public ResponseEntity<String> setBroadcastMessage(
            @RequestBody String message,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        inboxNotificationService.sendLegacyBroadcastMessage(message, adminDetails.getUsername());
        log.info("📢 Admin tərəfindən həm inbox, həm global announcement yayımlandı");
        return ResponseEntity.ok("Mesaj uğurla yayımlandı!");
    }
}
