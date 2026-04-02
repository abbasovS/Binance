package com.example.tradems.controller;

import com.example.tradems.dto.request.OpenTradeRequest;
import com.example.tradems.dto.request.UpdateTPSLRequest;
import com.example.tradems.dto.response.OpenTradeResponse;
import com.example.tradems.dto.response.PendingTradeResponse;
import com.example.tradems.dto.response.TradeHistoryResponse;
import com.example.tradems.model.TradeEntity;
import com.example.tradems.model.UserEntity;
import com.example.tradems.service.TradeService;
import com.example.tradems.service.UserService;
import com.example.tradems.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trades/user")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    private UserEntity getAuthenticatedUser(String authHeader) {
        String email = jwtUtil.extractEmailFromToken(authHeader);
        return userService.getUserByEmail(email)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));
    }

    @PostMapping("/open")
    public ResponseEntity<TradeEntity> openTrade(
            @Valid @RequestBody OpenTradeRequest request,
            @RequestHeader("Authorization") String authHeader) {

        UserEntity user = getAuthenticatedUser(authHeader);

        OpenTradeRequest secureRequest = new OpenTradeRequest(
                user.getId(),
                request.symbol(),
                request.side(),
                request.margin(),
                request.leverage(),
                request.takeProfit(),
                request.stopLoss(),
                request.targetPrice()
        );

        return ResponseEntity.ok(tradeService.openTrade(secureRequest));
    }

    @GetMapping("/active")
    public ResponseEntity<List<OpenTradeResponse>> getActiveTrades(@RequestHeader("Authorization") String authHeader) {
        try {
            UserEntity user = getAuthenticatedUser(authHeader);
            return ResponseEntity.ok(tradeService.getActiveTrades(user.getId()));
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            // YALNIZ Token xətası olduqda 401 qaytarırıq (Logout bug fix)
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            // Digər sistem xətalarında 500 qaytarırıq ki, istifadəçini sistemdən atmasın
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PendingTradeResponse>> getPendingOrders(@RequestHeader("Authorization") String authHeader) {
        try {
            UserEntity user = getAuthenticatedUser(authHeader);
            return ResponseEntity.ok(tradeService.getUserPendingOrders(user.getId()));
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/cancel/{tradeId}")
    public ResponseEntity<String> cancelTrade(
            @PathVariable UUID tradeId,
            @RequestHeader("Authorization") String authHeader) {

        UserEntity user = getAuthenticatedUser(authHeader);
        tradeService.cancelPendingTrade(tradeId, user.getId()); // userId ötürülür
        return ResponseEntity.ok("Sifariş uğurla ləğv edildi və balans bərpa olundu.");
    }

    @DeleteMapping("/close/{tradeId}")
    public ResponseEntity<String> closeTrade(
            @PathVariable UUID tradeId,
            @RequestHeader("Authorization") String authHeader) {

        UserEntity user = getAuthenticatedUser(authHeader);
        tradeService.closeTradeManually(tradeId, user.getId()); // userId ötürülür
        return ResponseEntity.ok("Pozisiya bazar qiyməti ilə bağlandı və mənfəət/zərər balansa köçürüldü.");
    }

    @PutMapping("/update-tpsl/{tradeId}")
    public ResponseEntity<String> updateTPSL(
            @PathVariable UUID tradeId,
            @RequestBody UpdateTPSLRequest request,
            @RequestHeader("Authorization") String authHeader) {

        UserEntity user = getAuthenticatedUser(authHeader);
        tradeService.updateTradeTPSL(tradeId, request.takeProfit(), request.stopLoss(), user.getId()); // userId ötürülür
        return ResponseEntity.ok("TP/SL uğurla yeniləndi.");
    }

    @GetMapping("/history")
    public ResponseEntity<List<TradeHistoryResponse>> getUserHistory(@RequestHeader("Authorization") String authHeader) {
        UserEntity user = getAuthenticatedUser(authHeader);
        return ResponseEntity.ok(tradeService.getUserTradeHistory(user.getId()));
    }
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<TradeHistoryResponse>> getPublicUserHistory(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String authHeader) {
        jwtUtil.extractEmailFromToken(authHeader);
        return ResponseEntity.ok(tradeService.getUserTradeHistory(userId));
    }
}