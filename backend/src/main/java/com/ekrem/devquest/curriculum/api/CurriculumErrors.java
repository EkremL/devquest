package com.ekrem.devquest.curriculum.api;

import com.ekrem.devquest.curriculum.application.*;
import com.ekrem.devquest.curriculum.api.CurriculumDtos.ApiError;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class CurriculumErrors {
    @ExceptionHandler(ImportProblem.class)
    ResponseEntity<ApiError> importProblem(ImportProblem problem) { return ResponseEntity.status(problem.getStatus()).body(new ApiError(problem.getCode(),problem.getMessage())); }
    @ExceptionHandler(MarkdownExportRenderer.ExportIntegrityException.class)
    ResponseEntity<ApiError> exportIntegrity() {
        return ResponseEntity.status(409).body(new ApiError("EXPORT_INTEGRITY_ERROR", "Export stopped because the stored source and identity mappings could not be verified. No progress was changed."));
    }
    @ExceptionHandler(CurriculumReader.MissingItemException.class)
    ResponseEntity<ApiError> missing() { return ResponseEntity.status(404).body(new ApiError("NOT_FOUND", "The requested curriculum item does not exist.")); }
    @ExceptionHandler({ProgressService.StaleProgressException.class, OptimisticLockingFailureException.class})
    ResponseEntity<ApiError> stale() { return ResponseEntity.status(409).body(new ApiError("PROGRESS_CONFLICT", "Progress changed in another request. Reload the latest status before trying again.")); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> invalid() { return ResponseEntity.badRequest().body(new ApiError("INVALID_REQUEST", "Provide a valid item ID, progress status, and nonnegative version.")); }
}
