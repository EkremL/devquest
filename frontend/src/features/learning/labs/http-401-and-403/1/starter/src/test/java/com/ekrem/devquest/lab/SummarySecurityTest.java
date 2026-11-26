package com.ekrem.devquest.lab;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class SummarySecurityTest {
    private static final String SUMMARY = "/api/tasks/summary";
    private static final String CHALLENGE = "Basic realm=\"task-lab\"";
    private MockMvc mvc;

    @BeforeEach
    void setUp(@Autowired WebApplicationContext context) {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousCallerReceives401WithBasicChallenge() throws Exception {
        authenticationFailure(mvc.perform(get(SUMMARY)))
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, CHALLENGE));
    }

    @Test
    void wrongPasswordReceives401WithSameBasicChallenge() throws Exception {
        authenticationFailure(mvc.perform(get(SUMMARY).with(httpBasic("demo-reader", "wrong-password"))))
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, CHALLENGE));
    }

    @Test
    void unknownAccountHasTheSamePublicFailureBodyAsWrongPassword() throws Exception {
        authenticationFailure(mvc.perform(get(SUMMARY).with(httpBasic("unknown-user", "wrong-password"))));
        authenticationFailure(mvc.perform(get(SUMMARY).with(httpBasic("demo-reader", "wrong-password"))));
    }

    @Test
    void validCreatorLacksReadAuthorityAndReceives403WithoutChallenge() throws Exception {
        mvc.perform(get(SUMMARY).with(httpBasic("demo-creator", "demo-creator-pass")))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string("{\"error\":\"access_denied\"}"));
    }

    @Test
    void validReaderReceives200WithoutChallenge() throws Exception {
        mvc.perform(get(SUMMARY).with(httpBasic("demo-reader", "demo-reader-pass")))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE))
                .andExpect(content().json("{\"taskCount\":3}"));
    }

    private ResultActions authenticationFailure(ResultActions response) throws Exception {
        return response.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string("{\"error\":\"authentication_required\"}"));
    }
}
