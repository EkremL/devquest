package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.api.ImportDtos.Change;
import com.ekrem.devquest.curriculum.application.RoadmapParser.*;
import lombok.*;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.stream.Collectors;

/** Conservative occurrence matching. No fuzzy rename guesses and no matching by a label alone. */
@Component
public class CurriculumReconciler {
    @Getter @AllArgsConstructor
    public static class Existing {
        private final UUID id;
        private final String status;
        private final long version;
    }
    @Getter @AllArgsConstructor
    public static class Result {
        private final Map<UUID, UUID> identities;
        private final List<Change> changes;
    }
    public Map<UUID,String> paths(Parsed parsed) {
        Map<UUID,String> result = new LinkedHashMap<>();
        for (var section : parsed.getSections()) {
            String path = section.getKind().equals("ROOT") ? "ROOT" : result.get(section.getParentId()) + " / " + section.getTitle();
            if (result.containsValue(path)) throw new ImportProblem("INVALID_SOURCE", "Duplicate section headings within the same parent are not supported.", 400);
            result.put(section.getId(), path);
        }
        return result;
    }
    public Result compare(Parsed old, Parsed next, List<Existing> stored, Set<String> retiredLabels) {
        var oldPaths = paths(old); var newPaths = paths(next);
        Map<UUID,Existing> existing = new HashMap<>();
        for(int i=0;i<old.getItems().size();i++) existing.put(old.getItems().get(i).getId(), stored.get(i));
        Map<UUID,Item> matched = new LinkedHashMap<>(); Set<UUID> used = new HashSet<>();
        List<Change> changes = new ArrayList<>();
        var oldGroups = groups(old,oldPaths); var newGroups = groups(next,newPaths);
        for(var entry : newGroups.entrySet()) {
            var previous = oldGroups.getOrDefault(entry.getKey(), List.of()); var incoming = entry.getValue();
            if(previous.isEmpty()) continue;
            if(previous.size()==1 && incoming.size()==1) {
                matched.put(incoming.getFirst().getId(),previous.getFirst()); used.add(previous.getFirst().getId());
            } else {
                String path = newPaths.get(incoming.getFirst().getNodeId());
                boolean unchanged = previous.size()==incoming.size() && sectionLabels(old,previous.getFirst().getNodeId()).equals(sectionLabels(next,incoming.getFirst().getNodeId()));
                if(!unchanged) changes.add(change("AMBIGUOUS",incoming.getFirst().getLabel(),path,path,"UNRESOLVED","Repeated labels in a changed section cannot be assigned safely. Restore that section's item sequence or reconcile it separately.",true));
                // Only used for displaying the remainder; any ambiguous plan is blocked in its entirety.
                if(unchanged) for(int i=0;i<incoming.size();i++){matched.put(incoming.get(i).getId(),previous.get(i));used.add(previous.get(i).getId());}
            }
        }
        for(var incoming : next.getItems()) {
            if(matched.containsKey(incoming.getId())) continue;
            var candidates = old.getItems().stream().filter(i -> !used.contains(i.getId()) && i.getLabel().equals(incoming.getLabel())).toList();
            if(candidates.size()!=1) continue;
            var previous = candidates.getFirst();
            String from=oldPaths.get(previous.getNodeId()), to=newPaths.get(incoming.getNodeId());
            boolean unique = old.getItems().stream().filter(i -> i.getLabel().equals(incoming.getLabel())).count()==1 && next.getItems().stream().filter(i -> i.getLabel().equals(incoming.getLabel())).count()==1;
            String oldKind=old.getSections().stream().filter(s->s.getId().equals(previous.getNodeId())).findFirst().orElseThrow().getKind();
            String newKind=next.getSections().stream().filter(s->s.getId().equals(incoming.getNodeId())).findFirst().orElseThrow().getKind();
            if(unique && oldPaths.containsValue(to) && newPaths.containsValue(from) && oldKind.equals(newKind)) {
                matched.put(incoming.getId(),previous);used.add(previous.getId());
            } else changes.add(change("AMBIGUOUS",incoming.getLabel(),from,to,"UNRESOLVED","Possible move or section rename has uncertain identity. Restore the original heading/location or split this change for manual review.",true));
        }
        var removed=old.getItems().stream().filter(i->!used.contains(i.getId())).toList();
        var added=next.getItems().stream().filter(i->!matched.containsKey(i.getId())).toList();
        if(!removed.isEmpty() && !added.isEmpty()) changes.add(change("RENAMED_OR_MODIFIED",removed.getFirst().getLabel()+" → "+added.getFirst().getLabel(),"","","UNRESOLVED","Unmatched old and new items could be renames. This combined removal/addition is blocked; restore wording or submit independent, reviewed changes.",true));
        removed.forEach(i->changes.add(change("REMOVED",i.getLabel(),oldPaths.get(i.getNodeId()),"","EXACT_SOURCE","Retire this item; retain its ID, progress, timestamps, prior mappings, and events.",false)));
        added.forEach(i->{
            boolean retired=retiredLabels.contains(i.getLabel());
            changes.add(change(retired?"AMBIGUOUS":"ADDED",i.getLabel(),"",newPaths.get(i.getNodeId()),retired?"UNRESOLVED":"NEW_OCCURRENCE",retired?"An item with this label is retired. Automatic resurrection or replacement could lose its identity; manual reconciliation is required.":"Create an independent ID using the imported checkbox state, without a historical completion date or activity event.",retired));
        });
        Map<UUID,UUID> identities=new HashMap<>();
        for(var incoming:next.getItems()) {
            var previous=matched.get(incoming.getId()); if(previous==null) continue;
            var state=existing.get(previous.getId()); identities.put(incoming.getId(),state.id);
            String from=oldPaths.get(previous.getNodeId()), to=newPaths.get(incoming.getNodeId());
            if(!from.equals(to)) changes.add(change("MOVED",incoming.getLabel(),from,to,"UNIQUE_WITH_STABLE_CONTEXT","Keep the stable ID and all PostgreSQL progress.",false));
            else if(previous.getPosition()!=incoming.getPosition()) changes.add(change("REORDERED",incoming.getLabel(),from,to,"EXACT_HIERARCHY","Keep the stable ID and progress; update this revision's position.",false));
            if(previous.isCompleted()!=incoming.isCompleted()) changes.add(change("MARKER_CHANGED",incoming.getLabel(),from,to,"EXACT_IDENTITY","Source checkbox changed. Existing PostgreSQL progress will not be overwritten.",false));
            if(incoming.isCompleted()!=state.status.equals("COMPLETED") || Set.of("IN_PROGRESS","NEEDS_REVIEW").contains(state.status)) changes.add(change("PROGRESS_CONFLICT",incoming.getLabel(),from,to,"PRESERVE_DATABASE","Keep PostgreSQL status "+state.status+"; ignore the uploaded checkbox for this existing item.",false));
        }
        var oldOrder=old.getSections().stream().map(s->oldPaths.get(s.getId())).toList();
        var newOrder=next.getSections().stream().map(s->newPaths.get(s.getId())).toList();
        if(!oldOrder.equals(newOrder)) changes.add(change("SECTIONS_CHANGED","Section structure/order","","","STRUCTURAL","Store the new heading order. Exact hierarchy matches retain section links; added/removed headings are versioned.",false));
        return new Result(identities,List.copyOf(changes));
    }
    private Map<String,List<Item>> groups(Parsed p,Map<UUID,String> paths){return p.getItems().stream().collect(Collectors.groupingBy(i->paths.get(i.getNodeId())+"\u0000"+i.getLabel(),LinkedHashMap::new,Collectors.toList()));}
    private List<String> sectionLabels(Parsed p,UUID node){return p.getItems().stream().filter(i->i.getNodeId().equals(node)).map(Item::getLabel).toList();}
    private Change change(String type,String label,String from,String to,String confidence,String message,boolean blocking){return new Change(type,label,from,to,confidence,message,blocking);}
}
