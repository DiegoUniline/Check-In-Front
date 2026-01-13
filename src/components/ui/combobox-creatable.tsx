import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxCreatableProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  onCreate?: (value: string) => Promise<ComboboxOption | void>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  createLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function ComboboxCreatable({
  options,
  value,
  onValueChange,
  onCreate,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No encontrado.",
  createLabel = "Crear",
  disabled = false,
  className,
}: ComboboxCreatableProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  
  // Check if the search term matches any existing option
  const searchTrimmed = search.trim().toLowerCase();
  const exactMatch = options.some(
    (opt) => opt.label.toLowerCase() === searchTrimmed
  );
  const canCreate = onCreate && searchTrimmed.length > 0 && !exactMatch;

  const handleCreate = async () => {
    if (!onCreate || !searchTrimmed) return;
    
    setIsCreating(true);
    try {
      const result = await onCreate(search.trim());
      if (result) {
        onValueChange(result.value);
      }
      setSearch("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTrimmed)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <div className="py-2 px-2 text-sm text-muted-foreground">
                  No se encontró "{search}"
                </div>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    disabled={isCreating}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? "Creando..." : `${createLabel} "${search}"`}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
