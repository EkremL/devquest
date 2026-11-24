package com.ekrem.devquest.curriculum.application;

import lombok.Getter;
@Getter
public class ImportProblem extends RuntimeException {
    private final String code;
    private final int status;
    public ImportProblem(String code,String message,int status){super(message);this.code=code;this.status=status;}
}
