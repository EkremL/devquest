package com.ekrem.devquest.curriculum.api;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Set;

/** No CORS grants. JSON + a custom header prevents simple cross-origin browser writes. */
@Component
public class LocalMutationFilter extends OncePerRequestFilter {
    private static final Set<String> ORIGINS = Set.of("http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:4173", "http://localhost:4173", "http://127.0.0.1:8080", "http://localhost:8080");
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/") && !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod())) {
            String origin = request.getHeader("Origin");
            String contentType = request.getContentType();
            if (!"1".equals(request.getHeader("X-DevQuest-Request")) || contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).startsWith("application/json")
                    || (origin != null && !ORIGINS.contains(origin)) || "cross-site".equals(request.getHeader("Sec-Fetch-Site"))
                    || !Set.of("127.0.0.1", "localhost").contains(request.getServerName())) {
                response.setStatus(403); response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"LOCAL_REQUEST_REQUIRED\",\"message\":\"Use the local DevQuest application to update progress.\"}");
                return;
            }
        }
        response.setHeader("Cache-Control", "no-store");
        chain.doFilter(request, response);
    }
}
