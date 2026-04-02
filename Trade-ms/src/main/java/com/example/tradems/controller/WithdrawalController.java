package com.example.tradems.controller;

import com.example.tradems.dto.request.WithdrawRequestDto;
import com.example.tradems.model.WithdrawalEntity;
import com.example.tradems.service.WithdrawalService;
import com.example.tradems.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/withdraw")
@RequiredArgsConstructor
public class WithdrawalController {

    private final WithdrawalService withdrawalService;
    private final JwtUtil jwtUtil; // JwtUtil əlavə edildi

    @GetMapping("/balance")
    public ResponseEntity<BigDecimal> getRealBalance(@RequestHeader("Authorization") String authHeader) {
        String email = jwtUtil.extractEmailFromToken(authHeader);
        return ResponseEntity.ok(withdrawalService.getMyRealBalance(email));
    }

    @PostMapping("/request")
    public ResponseEntity<String> requestWithdrawal(
            @RequestBody @Valid WithdrawRequestDto request,
            @RequestHeader("Authorization") String authHeader) {

        String email = jwtUtil.extractEmailFromToken(authHeader);
        withdrawalService.requestWithdrawal(email, request);
        return ResponseEntity.ok("Çıxarış sorğusu uğurla qeydə alındı! Tezliklə cüzdanınıza göndəriləcək.");
    }

    @GetMapping("/history")
    public ResponseEntity<List<WithdrawalEntity>> getMyHistory(@RequestHeader("Authorization") String authHeader) {
        String email = jwtUtil.extractEmailFromToken(authHeader);
        return ResponseEntity.ok(withdrawalService.getMyWithdrawals(email));
    }
}