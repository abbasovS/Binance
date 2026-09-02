package com.example.tradems;

import com.example.tradems.controller.TradeController;
import com.example.tradems.dto.response.OpenTradeResponse;
import com.example.tradems.enums.PositionSide;
import com.example.tradems.model.UserEntity;
import com.example.tradems.service.TradeService;
import com.example.tradems.service.UserService;
import com.example.tradems.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TradeController.class)
class TradeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TradeService tradeService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @Test
    void getActiveTrades_ShouldReturnList() throws Exception {
        UserEntity user = new UserEntity();
        user.setId(1L);
        user.setEmail("user@example.com");

        when(jwtUtil.extractEmailFromToken(any())).thenReturn("user@example.com");
        when(userService.getUserByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(tradeService.getActiveTrades(1L)).thenReturn(List.of(
                new OpenTradeResponse(
                        UUID.randomUUID(),
                        "BTCUSDT",
                        PositionSide.LONG,
                        new BigDecimal("50000"),
                        new BigDecimal("50500"),
                        new BigDecimal("100"),
                        10,
                        new BigDecimal("10"),
                        new BigDecimal("10"),
                        new BigDecimal("52000"),
                        new BigDecimal("49000"),
                        new BigDecimal("45000")
                )
        ));

        mockMvc.perform(get("/api/trades/user/active")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].symbol").value("BTCUSDT"));
    }

    @Test
    void closeTrade_ShouldReturnSuccessMessage() throws Exception {
        UUID tradeId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(1L);
        user.setEmail("user@example.com");

        when(jwtUtil.extractEmailFromToken(any())).thenReturn("user@example.com");
        when(userService.getUserByEmail("user@example.com")).thenReturn(Optional.of(user));

        mockMvc.perform(delete("/api/trades/user/close/" + tradeId)
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("Pozisiya bazar qiyməti ilə bağlandı və mənfəət/zərər balansa köçürüldü."));
    }
}
