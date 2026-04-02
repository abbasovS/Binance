package com.example.tradems.controller;

import com.example.tradems.dto.request.CreateUserRequest;
import com.example.tradems.dto.response.ContestStatusResponse;
import com.example.tradems.model.UserEntity;
import com.example.tradems.scheduled.ContestManagerService;
import com.example.tradems.service.UserService;
import com.example.tradems.util.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final ContestManagerService contestManagerService;

    @PostMapping("/create")
    public ResponseEntity<UserEntity> createUser(
            @RequestBody CreateUserRequest request,
            @RequestHeader("Authorization") String authHeader) {

        String emailFromToken = jwtUtil.extractEmailFromToken(authHeader);

        UserEntity user = userService.createUser(
                request.username(),
                emailFromToken,
                request.isPremium()
        );
        return ResponseEntity.ok(user);
    }

    @GetMapping("/me")
    public ResponseEntity<UserEntity> getMyProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtUtil.extractEmailFromToken(authHeader);
            return userService.getUserByEmail(email)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<UserEntity>> getLeaderboard() {
        List<UserEntity> leaderboard = userService.getLeaderboard();
        return ResponseEntity.ok(leaderboard);
    }

    @GetMapping("/contest/status")
    public ResponseEntity<ContestStatusResponse> getContestStatus() {
        return ResponseEntity.ok(contestManagerService.getCurrentContestStatus());
    }

}