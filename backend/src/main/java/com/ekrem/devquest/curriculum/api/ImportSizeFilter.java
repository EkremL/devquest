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
        if(request.getMethod().equals("POST") && request.getRequestURI().startsWith("/api/") && request.getRequestURI().contains("import-previews")) {
            byte[] body=request.getInputStream().readNBytes(750001);
            if(body.length>750000){response.setStatus(413);response.setContentType("application/json");response.getWriter().write("{\"code\":\"UPLOAD_TOO_LARGE\",\"message\":\"The import request is too large. Choose a Markdown file of at most 512 KiB.\"}");return;}
            var input=new ByteArrayInputStream(body);
            request=new HttpServletRequestWrapper(request){@Override public ServletInputStream getInputStream(){return new ServletInputStream(){public int read(){return input.read();}public int read(byte[] b,int off,int len){return input.read(b,off,len);}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener listener){throw new UnsupportedOperationException("Synchronous import only");}};}};
        }
        chain.doFilter(request,response);
    }
}
