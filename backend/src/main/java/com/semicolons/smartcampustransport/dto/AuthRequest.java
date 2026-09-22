package com.semicolons.smartcampustransport.dto;

public record AuthRequest(
    String email,
    String password
) {}
