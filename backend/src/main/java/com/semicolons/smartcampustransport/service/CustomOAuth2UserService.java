package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.entity.User;
import com.semicolons.smartcampustransport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Custom OAuth2 user service that creates/updates local user records.
 * Handles both Google and GitHub OAuth2 login.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oauth2User.getAttributes();

        // Extract user info based on provider
        String email;
        String name;
        String providerId;
        String pictureUrl;

        if ("google".equals(registrationId)) {
            email = (String) attributes.get("email");
            name = (String) attributes.get("name");
            providerId = (String) attributes.get("sub");
            pictureUrl = (String) attributes.get("picture");
        } else if ("github".equals(registrationId)) {
            email = (String) attributes.get("email");
            name = (String) attributes.get("login");
            providerId = String.valueOf(attributes.get("id"));
            pictureUrl = (String) attributes.get("avatar_url");
        } else {
            throw new OAuth2AuthenticationException("Unsupported OAuth2 provider: " + registrationId);
        }

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Email not provided by OAuth2 provider");
        }

        // Create or update user
        User user = userRepository.findByProviderAndProviderId(registrationId, providerId)
            .orElseGet(() -> {
                // Check if email already exists with different provider
                if (userRepository.existsByEmail(email)) {
                    log.warn("Email {} already exists with different provider", email);
                    // For simplicity, we'll allow this but in production you might want to link accounts
                }

                User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .provider(registrationId)
                    .providerId(providerId)
                    .pictureUrl(pictureUrl)
                    .role(User.Role.STUDENT) // Default role
                    .build();
                return userRepository.save(newUser);
            });

        // Update last login
        user.setLastLoginAt(Instant.now());
        user.setName(name);
        user.setPictureUrl(pictureUrl);
        userRepository.save(user);

        log.info("User {} logged in via {}", email, registrationId);

        return new DefaultOAuth2User(
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
            attributes,
            "google".equals(registrationId) ? "sub" : "id"
        );
    }
}
