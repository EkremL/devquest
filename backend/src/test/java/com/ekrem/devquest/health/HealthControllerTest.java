package com.ekrem.devquest.health;

import com.ekrem.devquest.health.api.HealthController;
import com.ekrem.devquest.health.api.HealthResponse;
import com.ekrem.devquest.health.application.HealthService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HealthControllerTest {
    @Test
    void returnsHealthyDependencyStatusAsJson() throws Exception {
        HealthService service = mock(HealthService.class);
        when(service.check()).thenReturn(new HealthResponse("DevQuest", "UP", "UP", "UP"));
        MockMvcBuilders.standaloneSetup(new HealthController(service)).build()
                .perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.application").value("DevQuest"))
                .andExpect(jsonPath("$.database").value("UP"));
    }

    @Test
    void returnsServiceUnavailableWhenDatabaseIsDown() throws Exception {
        HealthService service = mock(HealthService.class);
        when(service.check()).thenReturn(new HealthResponse("DevQuest", "DOWN", "DOWN", "UNKNOWN"));
        MockMvcBuilders.standaloneSetup(new HealthController(service)).build()
                .perform(get("/api/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"));
    }
}
