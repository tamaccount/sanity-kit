import { EditIcon, EyeOpenIcon, FolderIcon } from "@sanity/icons";
import { Box, Button, Card, Flex, Stack, Text, TextInput } from "@sanity/ui";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ObjectFieldProps, SlugValue, set, unset, useFormValue } from "sanity";
import styled from "styled-components";

import {
  getDocumentPath,
  slugify,
  stringToPathname,
} from "@tinloof/sanity-web";
import {
  usePresentationNavigate,
  usePresentationParams,
} from "sanity/presentation";
import { DocumentWithLocale } from "../types";

const UnlockButton = styled(Button)`
  position: static !important;
  cursor: pointer;
  > span:nth-of-type(2) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
`;

const FolderText = styled(Text)`
  span {
    white-space: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
  }
`;

export function PathnameFieldComponent(props: ObjectFieldProps<SlugValue>) {
  const defaultLocaleId = props.schemaType.options?.defaultLocaleId;
  const document = useFormValue([]) as DocumentWithLocale;
  const {
    inputProps: { onChange, value, readOnly },
    title,
    description,
  } = props;
  const segments = value?.current?.split("/").slice(0);
  const folder = segments?.slice(0, -1).join("/");
  const slug = segments?.slice(-1)[0] || "";
  const [folderLocked, setFolderLocked] = useState(!!folder);

  const fullPathInputRef = useRef<HTMLInputElement>(null);
  const pathSegmentInputRef = useRef<HTMLInputElement>(null);

  const updateFinalSegment = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const segment = slugify(e.currentTarget.value);
      // When updating only the final path segment, we don't allow slashes / sub-paths.
      // User must unlock the folder before doing so.
      const finalValue = [folder, segment]
        .filter((part) => typeof part === "string")
        .join("/");
      runChange(onChange, finalValue);
    },
    [folder, onChange]
  );

  const updateFullPath = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      runChange(onChange, e.currentTarget.value);
    },
    [onChange]
  );

  const unlockFolder: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      setFolderLocked(false);
      requestAnimationFrame(() => {
        fullPathInputRef?.current?.focus?.();
      });
    },
    [setFolderLocked, fullPathInputRef]
  );

  const handleBlur: React.FocusEventHandler<HTMLInputElement> =
    useCallback(() => {
      setFolderLocked(!!folder);
    }, [onChange, folder, setFolderLocked]);

  const localizedPathname = getDocumentPath(
    {
      ...document,
      pathname: value.current,
    },
    defaultLocaleId
  );

  const PathInput = useMemo(() => {
    if (folderLocked && folder) {
      return (
        <Flex gap={1} align="center">
          <Card
            paddingLeft={2}
            paddingRight={1}
            paddingY={1}
            border
            radius={1}
            tone="transparent"
            style={{ position: "relative" }}
          >
            <Flex gap={2} align="center">
              <Text muted>
                <FolderIcon />
              </Text>
              <FolderText muted>{folder}</FolderText>
              <UnlockButton
                icon={EditIcon}
                onClick={unlockFolder}
                title="Edit path's folder"
                mode="bleed"
                tone="primary"
                padding={2}
                fontSize={1}
                disabled={readOnly}
              >
                <span />
              </UnlockButton>
            </Flex>
          </Card>
          <Text muted size={2}>
            /
          </Text>
          <Box flex={1}>
            <TextInput
              value={slug}
              onChange={updateFinalSegment}
              ref={pathSegmentInputRef}
              onBlur={handleBlur}
              disabled={readOnly}
            />
          </Box>
          <PreviewButton localizedPathname={localizedPathname} />
        </Flex>
      );
    }

    // If unlocked or no folder, show a plain input for the full path
    return (
      <Flex gap={1} align="center">
        <Box flex={1}>
          <TextInput
            value={value?.current || ""}
            onChange={updateFullPath}
            ref={fullPathInputRef}
            onBlur={handleBlur}
            disabled={readOnly}
            style={{ flex: 1 }}
          />
        </Box>
        <PreviewButton localizedPathname={localizedPathname} />
      </Flex>
    );
  }, [
    folder,
    folderLocked,
    onChange,
    slug,
    readOnly,
    value?.current,
    unlockFolder,
    updateFullPath,
    updateFinalSegment,
    handleBlur,
  ]);

  return (
    <Stack space={3}>
      <Stack space={2} flex={1}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        {description && <Text size={1}>{description}</Text>}
      </Stack>

      {typeof value?.current === "string" && (
        <Text muted>
          {window.location.origin}
          {localizedPathname}
        </Text>
      )}

      {!readOnly && PathInput}
    </Stack>
  );
}

function runChange(onChange: (patch: any) => void, value?: string) {
  // We use stringToPathname to ensure that the value is a valid pathname.
  // We also allow trailing slashes to make it possible to create folders
  const finalValue = value
    ? stringToPathname(value, { allowTrailingSlash: true })
    : undefined;

  onChange(
    typeof value === "string"
      ? set({
          current: finalValue,
          _type: "slug",
        })
      : unset()
  );
}

function PreviewButton({ localizedPathname }: { localizedPathname: string }) {
  const navigate = usePresentationNavigate();
  const { preview } = usePresentationParams();

  return (
    <Button
      text="Preview"
      fontSize={1}
      height={"100%"}
      mode="default"
      tone="default"
      icon={EyeOpenIcon}
      disabled={preview === localizedPathname}
      title="Preview page"
      onClick={() => navigate(localizedPathname)}
    />
  );
}
