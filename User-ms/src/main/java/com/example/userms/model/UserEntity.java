package com.example.userms.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class UserEntity implements UserDetails
{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id;

    String email;

    @JsonIgnore
    String password;
    String phoneNumber;
    String telegramChatId;
    String telegramConnectCode;
    LocalDateTime telegramConnectCodeCreatedAt;

    @Column(nullable = false)
    boolean premium=false;

    @Column(nullable = false)
    private boolean inTournament = false;

    boolean emailVerified = false;
    String emailVerificationCode;

     boolean phoneVerified = false;
     LocalDateTime createdAt = LocalDateTime.now();

     boolean active = true;

    @Column(nullable = false)
    String role = "ROLE_USER";

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(this.role));
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true ;
    }

    @Override
    public boolean isEnabled() {
        return this.active;
    }
}
