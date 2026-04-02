package com.spring.security.pricems.controller;

import com.spring.security.pricems.dao.dto.request.AlertRequest;
import com.spring.security.pricems.dao.dto.response.AlertResponse;
import com.spring.security.pricems.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/crypto/alert")
@RequiredArgsConstructor
public class AlertController {
    private final AlertService alertService;

    @PostMapping("/add")
    public ResponseEntity<String> createAlert(@RequestBody AlertRequest request, Principal principal) {
        alertService.createAlert(request, principal.getName());
        return ResponseEntity.ok("Alert qeyd edildi: " + request.getSymbol());
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable Long id, Principal principal) {
        alertService.deleteAlert(id, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/all")
    public ResponseEntity<List<AlertResponse>> getAllAlert(Principal principal) {
        return ResponseEntity.ok(alertService.getAllAlerts(principal.getName()));
    }
}