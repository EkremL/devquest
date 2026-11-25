package com.ekrem.devquest.curriculum.api;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.*;

/** Bounds JSON before deserialization, including chunked requests. Nothing is written to disk. */
@Component
public class ImportSizeFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        boolean assessment = request.getRequestURI().startsWith("/api/learning/sessions/")
                && (request.getRequestURI().endsWith("/assessment/submit") || request.getRequestURI().contains("/assessment/draft") || request.getRequestURI().endsWith("/assessment/check"));
        boolean preview = request.getRequestURI().startsWith("/api/") && request.getRequestURI().contains("import-previews");
        if(request.getMethod().equals("POST") && (assessment || preview)) {
            int limit = assessment ? 32768 : 750000;
            byte[] body=request.getInputStream().readNBytes(limit + 1);
            if(body.length>limit){response.setStatus(413);response.setContentType("application/json");response.getWriter().write(assessment ? "{\"message\":\"Assessment submission exceeds 32 KiB.\"}" : "{\"code\":\"UPLOAD_TOO_LARGE\",\"message\":\"The import request is too large. Choose a Markdown file of at most 512 KiB.\"}");return;}
            var input=new ByteArrayInputStream(body);
            request=new HttpServletRequestWrapper(request){@Override public ServletInputStream getInputStream(){return new ServletInputStream(){public int read(){return input.read();}public int read(byte[] b,int off,int len){return input.read(b,off,len);}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener listener){throw new UnsupportedOperationException("Synchronous import only");}};}};
        }
        chain.doFilter(request,response);
    }
}
