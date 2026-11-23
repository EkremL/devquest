package com.ekrem.devquest.health.api;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class HealthResponse {
    private final String application;
    private final String status;
    private final String database;
    private final String migrations;
}
