package com.example.userms.service;

import org.springframework.stereotype.Service;

@Service
public class SystemStateService {

    private boolean tournamentActive = false;
    private String globalMessage = "";

    public boolean isTournamentActive() {
        return tournamentActive;
    }

    public void setTournamentActive(boolean active) {
        this.tournamentActive = active;
    }

    public String getGlobalMessage() {
        return globalMessage;
    }

    public void setGlobalMessage(String message) {
        this.globalMessage = message;
    }
}