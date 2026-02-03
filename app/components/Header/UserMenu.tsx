import { Button } from "@chakra-ui/react";
import { Menu, Portal } from "@chakra-ui/react";
import { Link, Form } from "react-router";
import { LuChevronDown, LuBuilding2, LuLogOut } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import type { SessionData } from "~/lib/session.server";

type UserMenuProps = {
  user: SessionData;
};

export function UserMenu({ user }: UserMenuProps) {
  const { t } = useTranslation();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="sm">
          {user.name || user.email}
          <LuChevronDown />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="organizations" asChild>
              <Link to="/orgs">
                <LuBuilding2 />
                {t("header.myOrganizations")}
              </Link>
            </Menu.Item>
            <Menu.Separator />
            <Form action="/auth/logout" method="post">
              <Menu.Item value="logout" asChild>
                <button type="submit" style={{ width: "100%" }}>
                  <LuLogOut />
                  {t("header.logout")}
                </button>
              </Menu.Item>
            </Form>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
